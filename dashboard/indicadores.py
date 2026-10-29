"""Definição única dos indicadores de atendimento.

Supervisor, Monitor, Gestor e Mapa usam só estas funções, para que a mesma
métrica tenha o mesmo valor em todas as telas. As regras estão descritas em
docs/analise_dashboards_por_perfil.md (seção 4).
"""

import unicodedata
from collections import defaultdict

from django.db.models import Avg, Count, Q

from agendamentos.models import Agendamento

from .metrics import calculate_pct_acima_esperado
from .sla import SITUACOES_ENCERRADAS, com_duracao, combinar_horario, minutos


SITUACOES_AGUARDANDO = ("ATIVADO", "CHAMANDO")
SITUACOES_AUSENCIA = ("AUSENCIA_CIDADAO", "ATIVADO_AUSENTE")
SITUACOES_CANCELADAS = ("CANCELADO_CIDADAO", "CANCELADO_CRAS")
SITUACOES_RETIRADA = ("AGUARDANDO_RETIRADA", "CHAMANDO_RETIRADA")
# Quem chegou à unidade, independentemente de onde o atendimento parou.
SITUACOES_COMPARECEU = (*SITUACOES_AGUARDANDO, "ATENDIMENTO", *SITUACOES_ENCERRADAS)


def expressoes_contagem():
    """Contagens por situação, para `aggregate` ou `annotate` numa única consulta."""
    return {
        "total": Count("id"),
        "agendados": Count("id", filter=Q(situacao="AGENDADO")),
        "aguardando": Count("id", filter=Q(situacao__in=SITUACOES_AGUARDANDO)),
        "em_atendimento": Count("id", filter=Q(situacao="ATENDIMENTO")),
        "ausentes": Count("id", filter=Q(situacao__in=SITUACOES_AUSENCIA)),
        "ativado_ausente": Count("id", filter=Q(situacao="ATIVADO_AUSENTE")),
        "cancelados": Count("id", filter=Q(situacao__in=SITUACOES_CANCELADAS)),
        "encerrados": Count("id", filter=Q(situacao__in=SITUACOES_ENCERRADAS)),
        "finalizados": Count("id", filter=Q(situacao="FINALIZADO")),
        "em_retirada": Count("id", filter=Q(situacao__in=SITUACOES_RETIRADA)),
        "compareceram": Count("id", filter=Q(situacao__in=SITUACOES_COMPARECEU)),
    }


def taxa_absenteismo(contagens):
    """Ausentes sobre quem já tinha de comparecer; agendamentos futuros e cancelados ficam fora."""
    base = contagens["ausentes"] + contagens["compareceram"]
    return round(contagens["ausentes"] / base * 100, 2) if base else 0


def contar(queryset):
    contagens = queryset.aggregate(**expressoes_contagem())
    contagens["taxa_absenteismo"] = taxa_absenteismo(contagens)
    return contagens


def contar_por(queryset, campo):
    linhas = queryset.values(campo).annotate(**expressoes_contagem()).order_by()
    resultado = {}
    for linha in linhas:
        linha["taxa_absenteismo"] = taxa_absenteismo(linha)
        resultado[str(linha.pop(campo))] = linha
    return resultado


def tma_min(queryset):
    """Tempo médio de consulta, com as mesmas regras do SLA do supervisor."""
    encerrados = com_duracao(queryset.filter(situacao__in=SITUACOES_ENCERRADAS))
    return minutos(encerrados.aggregate(media=Avg("duracao_sla"))["media"])


def meta_do_servico(valor):
    try:
        meta = int(valor or 0)
    except (TypeError, ValueError):
        return None
    return meta if meta > 0 else None


def eh_especializado(tipo_servico_nome):
    texto = unicodedata.normalize("NFD", str(tipo_servico_nome or "").lower())
    return "especial" in "".join(ch for ch in texto if unicodedata.category(ch) != "Mn")


class Tempos:
    """Acumula duração (do banco, pelas regras do SLA), espera e aderência à meta."""

    def __init__(self):
        self.encerrados = 0
        self.medidos = 0
        self.soma_duracao = 0.0
        self.com_meta = 0
        self.soma_meta = 0.0
        self.dentro_meta = 0
        self.soma_excedente = 0.0
        self.com_espera = 0
        self.soma_espera = 0.0

    def adicionar(self, linha):
        self.encerrados += 1
        inicio = linha["inicio_atendimento_em"] or combinar_horario(linha["data"], linha["data_hora_inicio_atendimento"])
        if inicio and linha["horario"]:
            espera = (inicio - combinar_horario(linha["data"], linha["horario"])).total_seconds() / 60
            # Quem é atendido antes do horário marcado não esperou.
            self.soma_espera += max(espera, 0)
            self.com_espera += 1
        if linha["duracao_sla"] is None:
            return
        duracao = linha["duracao_sla"].total_seconds() / 60
        self.medidos += 1
        self.soma_duracao += duracao
        meta = meta_do_servico(linha["servico__tipo_servico__tempo_atendimento"])
        if meta:
            self.com_meta += 1
            self.soma_meta += meta
            self.dentro_meta += duracao <= meta
            self.soma_excedente += max(duracao - meta, 0)

    def juntar(self, outro):
        for campo, valor in vars(outro).items():
            setattr(self, campo, getattr(self, campo) + valor)
        return self

    @staticmethod
    def _media(soma, total):
        return round(soma / total, 2) if total else 0

    def resumo(self):
        atendimento = self._media(self.soma_duracao, self.medidos)
        esperado = self._media(self.soma_meta, self.com_meta)
        return {
            "encerrados": self.encerrados,
            "medidos": self.medidos,
            "sem_medicao": self.encerrados - self.medidos,
            "tempo_medio_atendimento_min": atendimento,
            "tempo_medio_esperado_min": esperado,
            "tempo_medio_espera_min": self._media(self.soma_espera, self.com_espera),
            "tempo_excedente_medio_min": self._media(self.soma_excedente, self.com_meta),
            "pct_acima_esperado": round(calculate_pct_acima_esperado(atendimento, esperado), 2),
            "pct_dentro_meta": round(self.dentro_meta / self.com_meta * 100, 2) if self.com_meta else None,
        }


CAMPOS_TEMPO = (
    "data", "horario", "inicio_atendimento_em", "data_hora_inicio_atendimento",
    "duracao_sla", "servico__tipo_servico__tempo_atendimento",
)


def tempos_por(queryset, *campos):
    """Agrupa os tempos das consultas encerradas pela chave formada por `campos`."""
    grupos = defaultdict(Tempos)
    selecionados = list(dict.fromkeys((*campos, *CAMPOS_TEMPO)))
    linhas = com_duracao(queryset.filter(situacao__in=SITUACOES_ENCERRADAS)).values(*selecionados).order_by()
    for linha in linhas.iterator(chunk_size=5000):
        chave = linha[campos[0]] if len(campos) == 1 else tuple(linha[c] for c in campos)
        grupos[chave].adicionar(linha)
    return grupos


def metricas_por_servico(queryset):
    campos = ("servico_id", "servico__nome", "servico__tipo_servico__nome", "servico__tipo_servico__tempo_atendimento")
    resultado = []
    for (servico_id, nome, tipo, meta), tempos in tempos_por(queryset, *campos).items():
        resumo = tempos.resumo()
        resultado.append({
            "servico_id": str(servico_id),
            "servico_nome": nome or "",
            "tipo_servico_nome": tipo or "",
            "esperado_min": meta_do_servico(meta),
            "total": resumo.pop("encerrados"),
            **resumo,
        })
    return sorted(resultado, key=lambda item: (-item["total"], item["servico_nome"]))


# A Central 156 não existe no posto de saúde; registros antigos com essa origem ficam fora do mapa.
ORIGENS = ("RECEPCAO", "SITE", "FILA")


def metricas_mapa_por_unidade(unidade_ids, data_inicio, data_fim):
    """Resumo de cada unidade para o mapa, com as mesmas regras dos dashboards."""
    ids = [str(uid) for uid in unidade_ids if uid]
    if not ids:
        return {}
    periodo = Agendamento.objects.filter(unidade_id__in=ids, data__range=(data_inicio, data_fim))
    contagens = contar_por(periodo, "unidade_id")

    origens = defaultdict(lambda: dict.fromkeys(ORIGENS, 0))
    for linha in periodo.values("unidade_id", "origem").annotate(total=Count("id")).order_by():
        if linha["origem"] in ORIGENS:
            origens[str(linha["unidade_id"])][linha["origem"]] = linha["total"]

    campos = ("unidade_id", "servico_id", "servico__tipo_servico__nome")
    total, comum, especial = defaultdict(Tempos), defaultdict(Tempos), defaultdict(Tempos)
    servicos = defaultdict(set)
    for (uid, servico_id, tipo), tempos in tempos_por(periodo, *campos).items():
        uid = str(uid)
        servicos[uid].add(servico_id)
        total[uid].juntar(tempos)
        (especial if eh_especializado(tipo) else comum)[uid].juntar(tempos)

    resultado = {}
    for uid in ids:
        resumo = total[uid].resumo()
        resumo_comum, resumo_especial = comum[uid].resumo(), especial[uid].resumo()
        resultado[uid] = {
            "atendimentos_total": contagens.get(uid, {}).get("total", 0),
            "taxa_absenteismo": contagens.get(uid, {}).get("taxa_absenteismo", 0),
            "tempo_medio_atendimento_min": resumo["tempo_medio_atendimento_min"],
            "tempo_medio_esperado_min": resumo["tempo_medio_esperado_min"],
            "tempo_medio_espera_min": resumo["tempo_medio_espera_min"],
            "tempo_excedente_medio_min": resumo["tempo_excedente_medio_min"],
            "pct_acima_esperado": resumo["pct_acima_esperado"],
            "pct_dentro_meta": resumo["pct_dentro_meta"],
            "tempo_medio_atendimento_comum_min": resumo_comum["tempo_medio_atendimento_min"],
            "tempo_medio_esperado_comum_min": resumo_comum["tempo_medio_esperado_min"],
            "tempo_medio_atendimento_especializado_min": resumo_especial["tempo_medio_atendimento_min"],
            "tempo_medio_esperado_especializado_min": resumo_especial["tempo_medio_esperado_min"],
            "servicos_prestados_30d": resumo["encerrados"],
            "servicos_distintos_30d": len(servicos[uid]),
            "atendimentos_comum_30d": resumo_comum["encerrados"],
            "atendimentos_especializado_30d": resumo_especial["encerrados"],
            "origem_atendimentos": dict(origens[uid]),
        }
    return resultado
