"""Carga determinística e aditiva: persiste entidades reais, sem substituir registros existentes."""

import random
from collections import Counter, defaultdict
from datetime import datetime, time, timedelta
from decimal import Decimal
from uuid import NAMESPACE_URL, uuid5

from django.contrib.auth.hashers import make_password
from django.contrib.auth.models import Group, Permission
from django.core.management.base import CommandError
from django.db import transaction
from django.utils import timezone

from agendamentos.models import AgendaVaga, Agendamento
from app.models import Bairro
from app.validators import validate_CPF
from cidadaos.models import Cidadao
from fila_espera.models import FilaEspera
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from prontuario.models import Receita, ReceitaMedicamento, RegistroAtendimento
from servicos.catalogo_saude import CLASSES, SERVICOS, TIPOS
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import Guiche, ServicoUnidadePosto, UnidadePosto
from usuarios.models import EscalaTrabalho, Usuario
from .catalogo import (
    CIDS, DOMINIO, EXTRAS_POR_PERFIL, FAIXAS_ETARIAS, LEITURA_COMUM, MEDICAMENTOS, PERFIS, RISCOS, TAG, UNIDADES,
)
from .territorio import bairros_do_mapa, mais_proximos


def identificador(modelo, chave):
    return uuid5(NAMESPACE_URL, f"saude-perto:demonstracao:v1:{modelo}:{chave}")


def cpf_sintetico(numero):
    digitos = [int(d) for d in f"{numero:09d}"]
    for tamanho in (10, 11):
        resto = sum(d * peso for d, peso in zip(digitos, range(tamanho, 1, -1))) % 11
        digitos.append(0 if resto < 2 else 11 - resto)
    cpf = "".join(map(str, digitos))
    validate_CPF(cpf)
    return cpf


class CargaDemonstracao:
    def __init__(self, *, senha, data_base, unidades=8, cidadaos=400, agendamentos=3000, fila=80, dias=90, seed=42, database="default"):
        self.senha_hash = make_password(senha)
        self.base, self.dias, self.db = data_base, dias, database
        self.quantidades = dict(unidades=unidades, cidadaos=cidadaos, agendamentos=agendamentos, fila=fila)
        self.rng = random.Random(seed)
        # Sorteios da variação usam outro gerador: a sequência original (e os totais da carga) não muda.
        self.variacao = random.Random(seed * 7919 + 1)
        self.territorio = {}
        self.antigo = self.instante(data_base - timedelta(days=dias + 30), time(7))
        self.criados, self.totais = Counter(), Counter()
        self.profissionais = {}
        self.logins = {}

    @staticmethod
    def instante(data, horario):
        return timezone.make_aware(datetime.combine(data, horario))

    def entidade(self, model, chave, **defaults):
        """IDs estáveis tornam a reexecução aditiva; colisões de cadastro causam rollback."""
        pk = identificador(model._meta.label_lower, chave)
        obj, criado = model.objects.using(self.db).get_or_create(pk=pk, defaults=defaults)
        if criado:
            model.objects.using(self.db).filter(pk=pk).update(created_at=self.antigo, updated_at=self.antigo)
            obj.created_at = obj.updated_at = self.antigo
        self.criados[model._meta.model_name] += int(criado)
        self.totais[model._meta.model_name] += 1
        return obj

    def inserir(self, model, objetos):
        """Insere apenas IDs ausentes e preserva os carimbos históricos, inclusive no bulk_create."""
        if not objetos:
            return []
        existentes = model.objects.using(self.db).in_bulk([o.pk for o in objetos])
        identidades = {
            "agendavaga": ("unidade_id", "tipo_servico_id", "data", "horario"),
            "agendamento": ("cidadao_id", "unidade_id", "servico_id", "data", "horario"),
            "receita": ("agendamento_id", "cidadao_id"),
            "receitamedicamento": ("receita_id", "medicamento_id"),
        }.get(model._meta.model_name, ())
        for obj in objetos:
            anterior = existentes.get(obj.pk)
            if anterior and any(getattr(anterior, campo) != getattr(obj, campo) for campo in identidades):
                raise CommandError("O cenário difere da carga existente. Use os mesmos parâmetros ou outro banco de demonstração.")
        novos = [obj for obj in objetos if obj.pk not in existentes]
        carimbos = {obj.pk: (obj.created_at, obj.updated_at) for obj in novos}
        model.objects.using(self.db).bulk_create(novos, batch_size=300)
        for obj in novos:
            obj.created_at, obj.updated_at = carimbos[obj.pk]
        if novos:
            model.objects.using(self.db).bulk_update(novos, ["created_at", "updated_at"], batch_size=200)
        self.criados[model._meta.model_name] += len(novos)
        self.totais[model._meta.model_name] += len(objetos)
        return novos

    def bairro_real(self, nome):
        """Bairro com nome igual ao do mapa; reaproveita o cadastro existente em vez de duplicar o nome."""
        existente = Bairro.objects.using(self.db).filter(nome__iexact=nome).order_by("created_at", "id").first()
        if existente:
            self.totais["bairro"] += 1
            return existente
        return self.entidade(Bairro, f"real:{nome}", nome=nome)

    def registro(self, model, chave, *, criado=None, atualizado=None, **campos):
        return model(id=identificador(model._meta.label_lower, chave),
            created_at=criado or self.antigo, updated_at=atualizado or criado or self.antigo, **campos)

    def executar(self):
        with transaction.atomic(using=self.db):
            quantidade_anterior = Agendamento.objects.using(self.db).filter(observacoes_gerais=f"{TAG} Atendimento sintético.").count()
            if quantidade_anterior and quantidade_anterior != self.quantidades["agendamentos"]:
                raise CommandError("Já existe uma carga com outro tamanho. Os registros foram preservados; use outro banco para um cenário diferente.")
            self.catalogo()
            self.usuarios()
            self.cidadaos()
            self.atendimentos()
            self.estoque()
            self.fila()
        return {"novos": dict(self.criados), "registros_da_carga": dict(self.totais), "logins": self.logins}

    def catalogo(self):
        self.unidades, self.servicos, self.medicamentos = [], [], []
        classes = {nome: self.entidade(ClasseServico, nome, nome=f"{TAG} {nome}", descricao=descricao) for nome, descricao in CLASSES}
        tipos = {nome: self.entidade(TipoServico, nome, nome=f"{TAG} {nome}", descricao=descricao, tempo_atendimento=tempo) for nome, descricao, tempo in TIPOS}
        for idx in (0, 2, 3, 7, 11, 14, 19):
            nome, classe, tipo, marcacao, receita, dispensacao = SERVICOS[idx]
            self.servicos.append(self.entidade(Servico, nome, nome=f"{TAG} {nome}", classe=classes[classe],
                tipo_servico=tipos[tipo], tipo_marcacao=marcacao, gera_receita=receita, envolve_dispensacao=dispensacao))
        for idx, (nome, lat, lon) in enumerate(UNIDADES[:self.quantidades["unidades"]]):
            # Bairros reais perto da unidade, para as camadas por bairro do mapa; sem o GeoJSON, volta ao bairro fictício.
            if bairros_do_mapa():
                bairros = [self.bairro_real(b) for b in mais_proximos(lat, lon, 4, self.variacao)]
            else:
                bairros = [self.entidade(Bairro, nome, nome=f"{TAG} {nome}")]
            bairro = bairros[0]
            unidade = self.entidade(UnidadePosto, idx, nome=f"{TAG} Unidade {nome}", bairro=bairro,
                logradouro=f"Rua de Demonstração {idx + 1}", numero=str((idx + 1) * 100), cep="60000000",
                telefone="8533333333", email=f"unidade{idx + 1}@{DOMINIO}",
                latitude=str(lat) if lat is not None else None, longitude=str(lon) if lon is not None else None,
                hora_manha_inicio=time(8), hora_manha_fim=time(12), hora_tarde_inicio=time(13), hora_tarde_fim=time(17))
            # Os dois bairros mais próximos são o território; os outros ficam fora dele.
            unidade.bairros_abrangencia.add(*bairros[:2])
            self.territorio[unidade.pk] = bairros
            self.unidades.append(unidade)
            for servico in self.servicos:
                self.entidade(ServicoUnidadePosto, f"{idx}:{servico.pk}", unidade=unidade, servico=servico,
                    dias_semana=[1, 2, 3, 4, 5, 6, 7], mesmo_expediente=True)
        for idx, (nome, concentracao, forma) in enumerate(MEDICAMENTOS):
            self.medicamentos.append(self.entidade(Medicamento, idx, nome=f"{TAG} {nome}", principio_ativo=nome,
                concentracao=concentracao, forma_farmaceutica=forma, unidade_medida="MG", via_administracao="ORAL", estoque_minimo=100))

    def usuarios(self):
        contador = 0
        for ui, unidade in enumerate(self.unidades):
            self.profissionais[unidade.pk] = {}
            for perfil in PERFIS:
                if perfil in {"admin", "gestor"} and ui > 0:
                    continue
                for repeticao in range(2 if perfil == "medico" else 1):
                    contador += 1
                    sufixo = "" if ui == 0 and repeticao == 0 else f".{ui + 1:02d}.{repeticao + 1:02d}"
                    email = f"{perfil}{sufixo}@{DOMINIO}"
                    user = self.entidade(Usuario, email, email=email, username=email, password=self.senha_hash,
                        nome_completo=f"{TAG} {perfil.capitalize()} {ui + 1:02d}-{repeticao + 1:02d}",
                        cpf=cpf_sintetico(910000000 + contador), telefone="85999999999",
                        is_staff=perfil == "admin", is_superuser=perfil == "admin")
                    grupo = Group.objects.using(self.db).filter(name__iexact=PERFIS[perfil]).first()
                    if grupo is None:
                        grupo = Group.objects.using(self.db).create(name=PERFIS[perfil])
                    user.groups.add(grupo)
                    user.user_permissions.add(*Permission.objects.using(self.db).filter(
                        codename__in=LEITURA_COMUM | EXTRAS_POR_PERFIL[perfil]))
                    user.unidades_lotacao.add(unidade)
                    if perfil in {"medico", "enfermeiro", "farmaceutico"}:
                        esperados = {"medico": ("Consulta Médica",), "enfermeiro": ("Consulta de Enfermagem", "Procedimento de Enfermagem"),
                                     "farmaceutico": ("Dispensação de Medicamentos",)}[perfil]
                        user.tipo_ofertados.add(*{s.tipo_servico for s in self.servicos if s.tipo_servico.nome.removeprefix(f"{TAG} ") in esperados})
                        guiche = self.entidade(Guiche, email, unidade=unidade, nome=f"{TAG} Sala {perfil} {repeticao + 1}")
                        if user.guiche_atual_id is None:
                            Usuario.objects.using(self.db).filter(pk=user.pk).update(guiche_atual=guiche)
                    self.entidade(EscalaTrabalho, email, profissional=user, unidade=unidade,
                        dias_semana=["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"],
                        turno1_inicio=time(8), turno1_fim=time(12), turno2_inicio=time(13), turno2_fim=time(17))
                    self.profissionais[unidade.pk].setdefault(perfil, []).append(user)
                    if ui == 0 and repeticao == 0:
                        self.logins[perfil] = email

    def perfil_do_cidadao(self, idx, unidade):
        var = self.variacao
        territorio = self.territorio[unidade.pk]
        # A maioria mora no território da unidade; uma parte, nos bairros vizinhos.
        bairro = var.choice(territorio[:2] if var.random() < 0.8 or len(territorio) < 3 else territorio[2:])
        _, menor, maior = var.choices(FAIXAS_ETARIAS, weights=[peso for peso, _, _ in FAIXAS_ETARIAS])[0]
        idade = var.randint(menor, maior)
        condicoes = var.choices(["", "Hipertensão", "Diabetes", "Hipertensão; Diabetes"], weights=[66, 18, 10, 6])[0]
        return {
            "bairro": bairro,
            "data_nascimento": self.base - timedelta(days=idade * 365 + var.randint(0, 364)),
            "sexo": var.choices(["FEMININO", "MASCULINO", "OUTRO"], weights=[54, 44, 2])[0],
            "cns": f"70{idx:013d}" if var.random() < 0.85 else None,
            "condicoes_cronicas": condicoes or None,
        }

    def cidadaos(self):
        self.pacientes = []
        for idx in range(self.quantidades["cidadaos"]):
            unidade = self.unidades[idx % len(self.unidades)]
            self.pacientes.append(self.registro(Cidadao, idx, nome=f"{TAG} Pessoa {idx + 1:04d}",
                cpf=cpf_sintetico(810000000 + idx), email=f"pessoa{idx + 1:04d}@{DOMINIO}", telefone="85988888888",
                unidade_origem=unidade, logradouro=f"Rua Fictícia {idx % 20 + 1}", numero=str(idx % 500 + 1), cep="60000000",
                **self.perfil_do_cidadao(idx, unidade)))
        self.inserir(Cidadao, self.pacientes)

    def registro_clinico(self, idx, criado, agendamento, paciente, unidade, profissional):
        """Classificação de risco, CID e sinais vitais variados, coerentes com as condições crônicas do paciente."""
        var = self.variacao
        condicoes = paciente.condicoes_cronicas or ""
        hipertenso, diabetico = "Hipertensão" in condicoes, "Diabetes" in condicoes
        cid = var.choices([c for c, _ in CIDS], weights=[peso for _, peso in CIDS])[0]
        if hipertenso and var.random() < 0.5:
            cid = "I10"
        elif diabetico and var.random() < 0.5:
            cid = "E11.9"
        sistolica = var.randint(135, 175) if hipertenso else var.randint(105, 138)
        febre = var.random() < 0.06
        return self.registro(RegistroAtendimento, idx, criado=criado, agendamento=agendamento,
            cidadao=paciente, unidade=unidade, profissional=profissional,
            queixa_principal=f"{TAG} Registro clínico sintético.",
            classificacao_risco=var.choices([r for r, _ in RISCOS], weights=[peso for _, peso in RISCOS])[0], cid=cid,
            pressao_sistolica=sistolica, pressao_diastolica=sistolica - var.randint(35, 50),
            glicemia_capilar=var.randint(140, 260) if diabetico else var.randint(75, 130),
            temperatura=Decimal(str(round(var.uniform(37.8, 39.2) if febre else var.uniform(36.0, 37.4), 1))))

    def atendimentos(self):
        rng = self.rng
        vagas, agendamentos, receitas, itens, registros = {}, [], [], [], []
        self.dispensacoes = defaultdict(list)
        self.saldos_vagas = Counter()
        ativos, ocupados = set(), set()
        qtd_fila = self.quantidades["fila"]
        pacientes = self.pacientes[:-qtd_fila] if qtd_fila else self.pacientes
        concluidos = {"FINALIZADO", "AGUARDANDO_RETIRADA", "CHAMANDO_RETIRADA"}
        var = self.variacao
        por_unidade = defaultdict(list)
        for paciente in pacientes:
            por_unidade[paciente.unidade_origem_id].append(paciente)
        for idx in range(self.quantidades["agendamentos"]):
            ui = idx % len(self.unidades)
            unidade = self.unidades[ui]
            servico = self.servicos[(idx // len(self.unidades)) % len(self.servicos)]
            perfil = "farmaceutico" if servico.envolve_dispensacao else ("medico" if servico.gera_receita else "enfermeiro")
            profissional = rng.choice(self.profissionais[unidade.pk][perfil])
            paciente = rng.choice(pacientes)
            # A maior parte das consultas é na unidade de origem do paciente; o resto conta como fora do território.
            if por_unidade[unidade.pk] and var.random() < 0.75:
                paciente = var.choice(por_unidade[unidade.pk])
            dia = self.base - timedelta(days=0 if idx < 80 else rng.randrange(self.dias))
            horario = time(8 + (idx // len(self.unidades)) % 9, 30 if idx % 2 else 0)
            inicio = self.instante(dia, horario) + timedelta(minutes=rng.randint(0, 25))
            # Mesmo sorteio de antes, agora relativo à meta do serviço: cada unidade tem um desempenho diferente.
            sorteio = rng.randint(8, 20)
            fator_unidade = 0.75 + ui * 0.08
            duracao = max(3, round(servico.tipo_servico.tempo_atendimento * fator_unidade * (0.6 + (sorteio - 8) / 15)))
            fim = inicio + timedelta(minutes=duracao)
            situacao = rng.choices(["FINALIZADO", "AUSENCIA_CIDADAO", "CANCELADO_CRAS"], weights=[80, 13, 7])[0]
            if idx < 40:
                situacao = ["AGENDADO", "ATIVADO", "CHAMANDO", "ATENDIMENTO", "FINALIZADO"][idx % 5]
            if idx == 40:
                dia = self.base - timedelta(days=2)
                horario = time(23, 50)
                inicio = self.instante(dia, horario)
                fim = inicio + timedelta(minutes=30)
                situacao = "FINALIZADO"
            if idx == 41:
                fim = inicio
                situacao = "FINALIZADO"
            motivo = None
            if situacao == "CANCELADO_CRAS":
                # Parte dos cancelamentos foi pedida pelo cidadão; os da unidade se dividem entre bloqueio e outros motivos.
                if var.random() < 0.4:
                    situacao, motivo = "CANCELADO_CIDADAO", "CIDADAO"
                else:
                    motivo = var.choices(["UNIDADE", "BLOQUEIO"], weights=[65, 35])[0]
            par = (paciente.pk, servico.tipo_servico_id)
            if situacao in {"AGENDADO", "ATIVADO", "CHAMANDO", "ATENDIMENTO"}:
                if par in ativos:
                    situacao = "FINALIZADO"
                else:
                    ativos.add(par)
                    if situacao in {"CHAMANDO", "ATENDIMENTO"}:
                        if profissional.pk in ocupados:
                            situacao = "ATIVADO"
                        else:
                            ocupados.add(profissional.pk)
            finalizado = situacao in concluidos
            if not finalizado and situacao != "ATENDIMENTO":
                inicio = None
            if not finalizado:
                fim = None
            if finalizado and idx % 97 == 0:
                inicio = fim = None  # Amostra de histórico sem medição, identificável no SLA.
            chave_vaga = f"{unidade.pk}:{servico.tipo_servico_id}:{dia}:{horario}"
            if chave_vaga not in vagas:
                vagas[chave_vaga] = self.registro(AgendaVaga, chave_vaga, unidade=unidade, tipo_servico=servico.tipo_servico,
                    data=dia, horario=horario, vagas=30, vagas_ocupadas=0)
            vaga = vagas[chave_vaga]
            cancelado = situacao in {"CANCELADO_CRAS", "CANCELADO_CIDADAO", "AUSENCIA_CIDADAO"}
            chegada = None
            if finalizado or situacao in {"ATIVADO", "CHAMANDO", "ATENDIMENTO"}:
                # Chegada entre 25 min antes e 20 min depois do horário marcado, sempre antes de a consulta começar.
                chegada = self.instante(dia, horario) + timedelta(minutes=var.randint(-25, 20))
                if inicio:
                    chegada = min(chegada, inicio - timedelta(minutes=1))
            if not cancelado:
                self.saldos_vagas[vaga.pk] += 1
            ag = self.registro(Agendamento, idx, criado=self.instante(dia - timedelta(days=3), time(9)),
                atualizado=fim or self.instante(dia, horario), cidadao=paciente, unidade=unidade, servico=servico,
                atendente=profissional if finalizado or situacao in {"CHAMANDO", "ATENDIMENTO"} else None,
                vaga=None if cancelado else vaga, data=dia, horario=horario, situacao=situacao,
                origem=rng.choice(["RECEPCAO", "SITE", "FILA"]),
                data_hora_inicio_atendimento=inicio.time() if inicio else None,
                data_hora_fim_atendimento=fim.time() if fim else None,
                inicio_atendimento_em=inicio, fim_atendimento_em=fim, ativado_em=chegada, motivo_cancelamento=motivo,
                final_atendimento="REALIZADO" if finalizado else None, observacoes_gerais=f"{TAG} Atendimento sintético.")
            agendamentos.append(ag)
            if finalizado and perfil == "enfermeiro":
                registros.append(self.registro_clinico(idx, fim or self.instante(dia, horario), ag, paciente, unidade, profissional))
            if not (finalizado and servico.gera_receita and rng.random() < 0.85):
                continue
            emissao = fim or self.instante(dia, horario)
            receita = self.registro(Receita, idx, criado=emissao, agendamento=ag, cidadao=paciente,
                profissional=profissional, data_emissao=emissao, data_validade=emissao.date() + timedelta(days=30),
                observacoes=f"{TAG} Receita fictícia para demonstração; sem finalidade clínica.")
            receitas.append(receita)
            pesos = [12 if mi == (ui * 2) % len(self.medicamentos) else 2 for mi in range(len(self.medicamentos))]
            escolhidos = []
            for _ in range(1 + idx % 3):
                disponiveis = [m for m in range(len(self.medicamentos)) if m not in escolhidos]
                escolhidos.append(rng.choices(disponiveis, weights=[pesos[mi] for mi in disponiveis])[0])
            receita_pendente = False
            for mi in escolhidos:
                med = self.medicamentos[mi]
                quantidade = rng.choice([10, 20, 30, 60])
                entregue = rng.choice([0, quantidade // 2, quantidade])
                item = self.registro(ReceitaMedicamento, f"{idx}:{mi}", criado=emissao, receita=receita, medicamento=med,
                    nome=med.nome, dosagem=f"{med.concentracao} mg", frequencia="Prescrição fictícia", duracao="Demonstração",
                    quantidade_prescrita=quantidade, quantidade_dispensada=entregue,
                    status_dispensacao="DISPENSADO" if entregue == quantidade else ("PARCIAL" if entregue else "PENDENTE"))
                itens.append(item)
                receita_pendente = receita_pendente or entregue < quantidade
                if entregue:
                    self.dispensacoes[(unidade.pk, med.pk)].append((item, entregue, emissao + timedelta(minutes=10)))
            if dia == self.base and receita_pendente and par not in ativos:
                ativos.add(par)
                ag.situacao = "AGUARDANDO_RETIRADA"
                ag.retirar_medicamento = True
            registros.append(self.registro_clinico(idx, emissao, ag, paciente, unidade, profissional))
        for vaga in vagas.values():
            vaga.vagas_ocupadas = self.saldos_vagas[vaga.pk]
            vaga.vagas = max(1, vaga.vagas_ocupadas + vaga.pk.int % 4)
        self.inserir(AgendaVaga, list(vagas.values()))
        self.inserir(Agendamento, agendamentos)
        novas_receitas = self.inserir(Receita, receitas)
        # data_emissao é auto_now_add: restaura a emissão histórica após inserir, sem tocar registros antigos.
        if novas_receitas:
            for receita in novas_receitas:
                receita.data_emissao = receita.created_at
            Receita.objects.using(self.db).bulk_update(novas_receitas, ["data_emissao"], batch_size=200)
        self.inserir(ReceitaMedicamento, itens)
        self.inserir(RegistroAtendimento, registros)

    def estoque(self):
        lotes, movimentos = [], []
        for ui, unidade in enumerate(self.unidades):
            farmaceutico = self.profissionais[unidade.pk]["farmaceutico"][0]
            for mi, med in enumerate(self.medicamentos):
                entregas = sorted(self.dispensacoes[(unidade.pk, med.pk)], key=lambda linha: (
                    linha[2], str(identificador(MovimentacaoEstoque._meta.label_lower, f"saida:{linha[0].pk}")),
                ))
                entregue = sum(qtd for _, qtd, _ in entregas)
                alvo = 20 if (ui + mi) % 7 == 0 else self.rng.randint(150, 600)
                inicial = entregue + alvo
                chave = f"{ui}:{mi}"
                lote = self.registro(LoteMedicamento, chave, unidade=unidade, medicamento=med, numero_lote=f"DEMO-{ui:02d}-{mi:02d}",
                    validade=self.base + timedelta(days=180), data_entrada=self.antigo.date(),
                    quantidade_inicial=inicial, quantidade_atual=alvo, fornecedor=f"{TAG} Fornecedor fictício")
                lotes.append(lote)
                saldo = inicial
                movimentos.append(self.registro(MovimentacaoEstoque, f"entrada:{chave}", lote=lote, tipo="ENTRADA",
                    quantidade=inicial, saldo_apos=saldo, usuario=farmaceutico, data=self.antigo, motivo=f"{TAG} Entrada sintética"))
                for item, quantidade, data in entregas:
                    saldo -= quantidade
                    movimentos.append(self.registro(MovimentacaoEstoque, f"saida:{item.pk}", criado=data, lote=lote,
                        tipo="SAIDA", quantidade=-quantidade, saldo_apos=saldo, usuario=farmaceutico,
                        data=data, receita_item=item, motivo=f"{TAG} Dispensação sintética"))
                if mi == 0:
                    vencido = self.registro(LoteMedicamento, f"vencido:{ui}", unidade=unidade, medicamento=med,
                        numero_lote=f"DEMO-VENCIDO-{ui:02d}", validade=self.base - timedelta(days=5),
                        data_entrada=self.antigo.date(), quantidade_inicial=30, quantidade_atual=30)
                    lotes.append(vencido)
                    movimentos.append(self.registro(MovimentacaoEstoque, f"entrada-vencido:{ui}", lote=vencido,
                        tipo="ENTRADA", quantidade=30, saldo_apos=30, usuario=farmaceutico,
                        data=self.antigo, motivo=f"{TAG} Lote vencido para testar alertas"))
        self.inserir(LoteMedicamento, lotes)
        self.inserir(MovimentacaoEstoque, movimentos)

    def fila(self):
        entradas = []
        quantidade = self.quantidades["fila"]
        for idx, paciente in enumerate(self.pacientes[-quantidade:] if quantidade else []):
            unidade = self.unidades[idx % len(self.unidades)]
            entradas.append(self.registro(FilaEspera, idx, criado=self.instante(self.base, time(8, idx % 60)),
                cidadao=paciente, unidade=unidade, servico=self.servicos[idx % len(self.servicos)],
                prioridade=self.variacao.choices(["NORMAL", "PREFERENCIAL", "PREFERENCIAL+"], weights=[60, 30, 10])[0],
                urgencia="ALTA" if self.variacao.random() < 0.1 else "NORMAL", status="AGUARDANDO_FILA"))
        self.inserir(FilaEspera, entradas)
