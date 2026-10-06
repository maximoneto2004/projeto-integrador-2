import csv
from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime
import json
from pathlib import Path
import uuid

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from medicamentos.importacao import (
    converter_booleano,
    inferir_via_administracao,
    limpar_opcional,
    normalizar_concentracao,
    normalizar_forma_farmaceutica,
)
from medicamentos.models import Medicamento


COLUNAS_OBRIGATORIAS = {
    "id",
    "nome",
    "principio_ativo",
    "forma_farmaceutica",
    "concentracao",
    "financiamento",
    "grupo",
    "codigo_atc",
    "controlado",
    "ativo",
    "observacoes",
    "criado_em",
    "atualizado_em",
}

COLUNAS_MODELO_IMPORTADAS = (
    "principio_ativo",
    "via_administracao",
    "controlado",
    "observacoes",
    "is_active",
)


@dataclass
class Pendencia:
    linha: int
    original: dict
    valor: str
    motivo: str
    sugestao: str = ""

    def para_csv(self):
        return {
            "linha_original": json.dumps(self.original, ensure_ascii=False),
            "id": self.original.get("id", ""),
            "nome": self.original.get("nome", ""),
            "valor_problematico": self.valor,
            "motivo": self.motivo,
            "sugestao_normalizacao_tentada": self.sugestao,
        }


@dataclass
class RegistroPreparado:
    linha: int
    original: dict
    id_origem: uuid.UUID | None = None
    dados: dict = field(default_factory=dict)
    criado_em: datetime | None = None
    atualizado_em: datetime | None = None
    pendencias: list[Pendencia] = field(default_factory=list)
    erros: list[str] = field(default_factory=list)
    duplicado_no_csv: bool = False

    @property
    def chave(self):
        return tuple(
            self.dados.get(campo)
            for campo in ("nome", "concentracao", "unidade_medida", "forma_farmaceutica")
        )


class Command(BaseCommand):
    help = "Importa de forma idempotente o catálogo externo de medicamentos, sem criar estoque."

    def add_arguments(self, parser):
        parser.add_argument("--arquivo", required=True, help="Caminho do CSV externo.")
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Valida e compara com o banco sem persistir medicamentos.",
        )
        parser.add_argument(
            "--atualizar",
            action="store_true",
            help="Atualiza campos do catálogo quando a chave natural já existir.",
        )
        parser.add_argument(
            "--relatorio",
            help="Destino do CSV de pendências. Padrão: ao lado do arquivo de origem.",
        )

    def handle(self, *args, **options):
        arquivo = Path(options["arquivo"]).expanduser().resolve()
        if not arquivo.is_file():
            raise CommandError(f"Arquivo não encontrado: {arquivo}")

        relatorio = (
            Path(options["relatorio"]).expanduser().resolve()
            if options.get("relatorio")
            else arquivo.with_name("importacao_medicamentos_pendencias.csv")
        )
        if relatorio == arquivo:
            raise CommandError("O relatório de pendências não pode sobrescrever o CSV de origem.")

        linhas, encoding, delimitador = self._ler_csv(arquivo)
        registros = [self._preparar_linha(numero, linha) for numero, linha in enumerate(linhas, start=2)]
        pendencias = [pendencia for registro in registros for pendencia in registro.pendencias]

        chaves_vistas = {}
        duplicidades = Counter()
        for registro in registros:
            if registro.erros:
                continue
            if registro.chave in chaves_vistas:
                registro.duplicado_no_csv = True
                primeira_linha = chaves_vistas[registro.chave]
                duplicidades[registro.chave] += 1
                pendencia = Pendencia(
                    linha=registro.linha,
                    original=registro.original,
                    valor=" | ".join(str(valor) for valor in registro.chave),
                    motivo=f"Chave natural duplicada após normalização; primeira ocorrência na linha {primeira_linha}.",
                    sugestao="Revisar se as apresentações representam o mesmo medicamento.",
                )
                registro.pendencias.append(pendencia)
                pendencias.append(pendencia)
            else:
                chaves_vistas[registro.chave] = registro.linha

        validos = [registro for registro in registros if not registro.erros]
        candidatos = [registro for registro in validos if not registro.duplicado_no_csv]
        plano, conflitos_id = self._planejar(candidatos, atualizar=options["atualizar"])
        for registro, mensagem in conflitos_id:
            registro.erros.append(mensagem)
            pendencia = Pendencia(
                linha=registro.linha,
                original=registro.original,
                valor=str(registro.id_origem or ""),
                motivo=mensagem,
                sugestao="Não reutilizar o UUID ou corrigir o registro conflitante antes da importação.",
            )
            registro.pendencias.append(pendencia)
            pendencias.append(pendencia)

        validos = [registro for registro in registros if not registro.erros]
        erros = [registro for registro in registros if registro.erros]
        self._gravar_relatorio(relatorio, pendencias)
        self._imprimir_resumo(
            arquivo=arquivo,
            relatorio=relatorio,
            encoding=encoding,
            delimitador=delimitador,
            registros=registros,
            validos=validos,
            plano=plano,
            erros=erros,
            duplicidades=duplicidades,
        )

        if options["dry_run"]:
            self.stdout.write(self.style.WARNING("DRY-RUN: nenhuma alteração foi persistida no banco."))
            return
        if erros:
            raise CommandError(
                "A importação não foi executada porque há registros com erro. "
                "Revise o relatório e execute novamente com --dry-run."
            )

        with transaction.atomic():
            for acao, registro, existente in plano:
                if acao == "criar":
                    medicamento = Medicamento.objects.create(
                        id=registro.id_origem or uuid.uuid4(),
                        **registro.dados,
                        estoque_minimo=0,
                        classe_terapeutica=None,
                        fabricante=None,
                        codigo_registro=None,
                    )
                    timestamps = {}
                    if registro.criado_em:
                        timestamps["created_at"] = registro.criado_em
                    if registro.atualizado_em:
                        timestamps["updated_at"] = registro.atualizado_em
                    if timestamps:
                        Medicamento.objects.filter(pk=medicamento.pk).update(**timestamps)
                elif acao == "atualizar":
                    campos_alterados = []
                    for campo in COLUNAS_MODELO_IMPORTADAS:
                        valor = registro.dados[campo]
                        if getattr(existente, campo) != valor:
                            setattr(existente, campo, valor)
                            campos_alterados.append(campo)
                    if campos_alterados:
                        existente.save(update_fields=[*campos_alterados, "updated_at"])

        criados = sum(acao == "criar" for acao, _, _ in plano)
        atualizados = sum(acao == "atualizar" for acao, _, _ in plano)
        self.stdout.write(self.style.SUCCESS(f"Importação concluída: {criados} criados e {atualizados} atualizados."))

    def _ler_csv(self, arquivo):
        bruto = arquivo.read_bytes()
        texto = None
        encoding_usado = None
        for encoding in ("utf-8-sig", "utf-8", "cp1252"):
            try:
                texto = bruto.decode(encoding)
                encoding_usado = encoding
                break
            except UnicodeDecodeError:
                continue
        if texto is None:
            raise CommandError("Não foi possível decodificar o CSV como UTF-8 ou CP1252.")

        try:
            dialeto = csv.Sniffer().sniff(texto[:65536], delimiters=",;\t|")
        except csv.Error as exc:
            raise CommandError(f"Não foi possível identificar o delimitador do CSV: {exc}") from exc

        leitor = csv.DictReader(texto.splitlines(), dialect=dialeto)
        colunas = set(leitor.fieldnames or [])
        faltantes = sorted(COLUNAS_OBRIGATORIAS - colunas)
        if faltantes:
            raise CommandError(f"Colunas obrigatórias ausentes: {', '.join(faltantes)}")
        return list(leitor), encoding_usado, dialeto.delimiter

    def _preparar_linha(self, numero, linha):
        registro = RegistroPreparado(linha=numero, original=dict(linha))
        nome = (linha.get("nome") or "").strip()
        principio = (linha.get("principio_ativo") or "").strip()
        if not nome:
            registro.erros.append("Nome não informado.")
        if not principio:
            registro.erros.append("Princípio ativo não informado.")

        try:
            registro.id_origem = uuid.UUID((linha.get("id") or "").strip())
        except (ValueError, AttributeError):
            registro.erros.append("UUID de origem inválido.")

        forma_original = (linha.get("forma_farmaceutica") or "").strip()
        forma = normalizar_forma_farmaceutica(forma_original)
        concentracao = normalizar_concentracao(linha.get("concentracao"))
        via = inferir_via_administracao(forma_original)

        try:
            controlado = converter_booleano(linha.get("controlado"), "controlado")
        except ValueError as exc:
            registro.erros.append(str(exc))
            controlado = False
        try:
            ativo = converter_booleano(linha.get("ativo"), "ativo")
        except ValueError as exc:
            registro.erros.append(str(exc))
            ativo = True

        registro.dados = {
            "nome": nome,
            "principio_ativo": principio,
            "forma_farmaceutica": forma,
            "concentracao": concentracao.concentracao,
            "unidade_medida": concentracao.unidade_medida,
            "via_administracao": via,
            "controlado": controlado,
            "observacoes": limpar_opcional(linha.get("observacoes")),
            "is_active": ativo,
        }

        if len(concentracao.concentracao) > Medicamento._meta.get_field("concentracao").max_length:
            registro.erros.append("Concentração excede o limite do model.")
        observacoes = registro.dados["observacoes"]
        if observacoes and len(observacoes) > Medicamento._meta.get_field("observacoes").max_length:
            registro.erros.append("Observações excedem o limite do model.")

        if forma == "OUTRO":
            registro.pendencias.append(
                Pendencia(
                    numero,
                    registro.original,
                    forma_original,
                    "Forma farmacêutica sem categoria equivalente.",
                    "OUTRO",
                )
            )
        if concentracao.ambigua:
            registro.pendencias.append(
                Pendencia(
                    numero,
                    registro.original,
                    str(linha.get("concentracao") or ""),
                    concentracao.motivo or "Concentração ambígua.",
                    f"{concentracao.concentracao} / {concentracao.unidade_medida}",
                )
            )
        if via == "NAO_INFORMADA":
            registro.pendencias.append(
                Pendencia(
                    numero,
                    registro.original,
                    forma_original,
                    "Via de administração não pode ser inferida com segurança pela forma.",
                    "NAO_INFORMADA",
                )
            )

        registro.criado_em = self._parse_datetime(linha.get("criado_em"), "criado_em", registro)
        registro.atualizado_em = self._parse_datetime(linha.get("atualizado_em"), "atualizado_em", registro)
        return registro

    @staticmethod
    def _parse_datetime(valor, campo, registro):
        texto = (valor or "").strip()
        if not texto:
            return None
        try:
            data = datetime.fromisoformat(texto)
            return timezone.make_aware(data) if timezone.is_naive(data) else data
        except ValueError:
            registro.erros.append(f"Data inválida em {campo}: {texto!r}")
            return None

    def _planejar(self, registros, atualizar):
        existentes = {
            (m.nome, m.concentracao, m.unidade_medida, m.forma_farmaceutica): m
            for m in Medicamento.objects.all()
        }
        ids_existentes = {
            valor
            for valor in Medicamento.objects.filter(
                pk__in=[registro.id_origem for registro in registros if registro.id_origem]
            ).values_list("pk", flat=True)
        }
        plano = []
        conflitos_id = []
        for registro in registros:
            existente = existentes.get(registro.chave)
            if existente is not None:
                mudou = any(
                    getattr(existente, campo) != registro.dados[campo]
                    for campo in COLUNAS_MODELO_IMPORTADAS
                )
                plano.append(("atualizar" if atualizar and mudou else "ignorar", registro, existente))
            elif registro.id_origem in ids_existentes:
                conflitos_id.append(
                    (registro, "UUID do CSV já pertence a outro medicamento no banco.")
                )
            else:
                plano.append(("criar", registro, None))
        return plano, conflitos_id

    @staticmethod
    def _gravar_relatorio(caminho, pendencias):
        caminho.parent.mkdir(parents=True, exist_ok=True)
        campos = [
            "linha_original",
            "id",
            "nome",
            "valor_problematico",
            "motivo",
            "sugestao_normalizacao_tentada",
        ]
        with caminho.open("w", encoding="utf-8-sig", newline="") as arquivo:
            escritor = csv.DictWriter(arquivo, fieldnames=campos)
            escritor.writeheader()
            escritor.writerows(pendencia.para_csv() for pendencia in pendencias)

    def _imprimir_resumo(
        self, *, arquivo, relatorio, encoding, delimitador, registros, validos, plano, erros, duplicidades
    ):
        formas = Counter(
            (
                registro.original.get("forma_farmaceutica", ""),
                registro.dados.get("forma_farmaceutica", ""),
            )
            for registro in validos
        )
        unidades = Counter(registro.dados.get("unidade_medida") for registro in validos)
        vias = Counter(registro.dados.get("via_administracao") for registro in validos)
        grupos = Counter(
            limpar_opcional(registro.original.get("grupo")) or "NÃO INFORMADO"
            for registro in validos
        )
        financiamentos = Counter(
            limpar_opcional(registro.original.get("financiamento")) or "NÃO INFORMADO"
            for registro in validos
        )
        controlados = Counter(registro.dados.get("controlado") for registro in validos)
        formas_outro = sum(registro.dados.get("forma_farmaceutica") == "OUTRO" for registro in validos)
        ambiguos = sum(bool(registro.pendencias) for registro in registros)
        criariam = sum(acao == "criar" for acao, _, _ in plano)
        atualizariam = sum(acao == "atualizar" for acao, _, _ in plano)
        ignorados = sum(acao == "ignorar" for acao, _, _ in plano) + sum(
            registro.duplicado_no_csv for registro in registros
        )

        self.stdout.write(f"ARQUIVO: {arquivo}")
        self.stdout.write(f"ENCODING: {encoding}")
        self.stdout.write(f"DELIMITADOR: {delimitador!r}")
        self.stdout.write(f"TOTAL CSV: {len(registros)}")
        self.stdout.write(f"VALIDADOS: {len(validos)}")
        self.stdout.write(f"CRIARIAM: {criariam}")
        self.stdout.write(f"ATUALIZARIAM: {atualizariam}")
        self.stdout.write(f"IGNORADOS: {ignorados}")
        self.stdout.write(f"ERROS: {len(erros)}")
        self.stdout.write("\nFORMAS NORMALIZADAS:")
        for (original, normalizada), quantidade in sorted(formas.items()):
            self.stdout.write(f"  {original or '[vazio]'} -> {normalizada}: {quantidade}")
        self._imprimir_counter("UNIDADES IDENTIFICADAS", unidades)
        self._imprimir_counter("VIAS INFERIDAS", Counter({k: v for k, v in vias.items() if k != "NAO_INFORMADA"}))
        self.stdout.write(f"\nVIAS NÃO INFORMADAS: {vias.get('NAO_INFORMADA', 0)}")
        self.stdout.write(f"REGISTROS COM FORMA OUTRO: {formas_outro}")
        self.stdout.write(f"REGISTROS AMBÍGUOS: {ambiguos}")
        self.stdout.write(
            f"POSSÍVEIS DUPLICIDADES: {sum(duplicidades.values())} linhas em {len(duplicidades)} chaves"
        )
        self.stdout.write("\nCONTROLADOS:")
        self.stdout.write(f"  true: {controlados.get(True, 0)}")
        self.stdout.write(f"  false: {controlados.get(False, 0)}")
        if validos and controlados.get(False, 0) == len(validos):
            self.stdout.write(
                self.style.WARNING(
                    "WARNING: todos os registros estão como controlado=false; o campo requer revisão futura."
                )
            )
        self._imprimir_counter("GRUPOS", grupos)
        self._imprimir_counter("FINANCIAMENTOS", financiamentos)
        self.stdout.write(f"\nRELATÓRIO DE PENDÊNCIAS: {relatorio}")
        if erros:
            self.stdout.write("ERROS POR LINHA:")
            for registro in erros[:20]:
                self.stdout.write(f"  linha {registro.linha} ({registro.original.get('nome', '')}): {'; '.join(registro.erros)}")

    def _imprimir_counter(self, titulo, contador):
        self.stdout.write(f"\n{titulo}:")
        for valor, quantidade in contador.most_common():
            self.stdout.write(f"  {valor}: {quantidade}")
