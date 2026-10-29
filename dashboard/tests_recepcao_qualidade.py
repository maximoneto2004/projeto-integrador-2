from datetime import datetime, time
from unittest.mock import patch

from django.contrib.auth.models import Group
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import AgendaVaga, Agendamento
from app.models import Bairro
from cidadaos.models import Cidadao
from fila_espera.models import FilaEspera
from medicamentos.models import Medicamento
from medicamentos.tests import PAYLOAD
from medicamentos.tests_estoque import criar_unidade
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import UnidadePosto
from usuarios.models import EscalaTrabalho
from .tests import DIA
from . import tests as sla_tests


URL_RECEPCAO = "/api/v1/dashboard-recepcao/"
URL_QUALIDADE = "/api/v1/qualidade-dados/"


class FluxoDoDiaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.unidade = criar_unidade("Posto Recepção")
        cls.outra = criar_unidade("Posto Vizinho")
        cls.recepcionista = sla_tests.SupervisorSlaTests.usuario("Recepcionista", "11144477735")
        cls.de_fora = sla_tests.SupervisorSlaTests.usuario("Recepcionista", "52998224725")
        cls.medico = sla_tests.SupervisorSlaTests.usuario("Médico", "39053344705")
        cls.recepcionista.unidades_lotacao.add(cls.unidade)
        cls.medico.unidades_lotacao.add(cls.unidade)
        cls.de_fora.unidades_lotacao.add(cls.outra)
        # Cadastro sem telefone, bairro, CNS nem data de nascimento.
        cls.cidadao = Cidadao.objects.create(nome="Paciente Recepção", cpf="15350946056")
        cls.outro_cidadao = Cidadao.objects.create(nome="Outro Paciente", cpf="71428793860", telefone="85999999999")
        cls.tipo = TipoServico.objects.create(nome="Consulta médica", tempo_atendimento=20)
        cls.servico = Servico.objects.create(nome="Consulta", classe=ClasseServico.objects.create(nome="Básica"), tipo_servico=cls.tipo)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.recepcionista)
        self.agora = timezone.make_aware(datetime.combine(DIA, time(10)))

    def agendamento(self, situacao, horario, cidadao=None):
        Agendamento.objects.bulk_create([Agendamento(
            cidadao=cidadao or self.cidadao, unidade=self.unidade, servico=self.servico, data=DIA, horario=horario, situacao=situacao,
        )])

    def resultados(self):
        with patch("django.utils.timezone.now", return_value=self.agora):
            response = self.client.get(URL_RECEPCAO, {"unidade_id": str(self.unidade.id)})
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]

    def test_separa_atrasados_de_quem_ainda_vai_chegar(self):
        self.agendamento("AGENDADO", time(8))
        self.agendamento("AGENDADO", time(11), cidadao=self.outro_cidadao)
        self.agendamento("ATIVADO", time(9))
        self.agendamento("CANCELADO_CIDADAO", time(9, 30))
        dados = self.resultados()
        self.assertEqual(dados["resumo"]["esperados"], 3)
        self.assertEqual(dados["resumo"]["chegaram"], 1)
        self.assertEqual(dados["resumo"]["atrasados"], 1)
        self.assertEqual(dados["resumo"]["a_chegar"], 1)
        self.assertEqual(dados["atrasados"][0]["horario"], "08:00")
        self.assertEqual(dados["atrasados"][0]["atraso_min"], 120)

    def test_vagas_livres_so_nos_horarios_que_ainda_vem(self):
        AgendaVaga.objects.create(unidade=self.unidade, tipo_servico=self.tipo, data=DIA, horario=time(8), vagas=2, vagas_ocupadas=0)
        AgendaVaga.objects.create(unidade=self.unidade, tipo_servico=self.tipo, data=DIA, horario=time(11), vagas=3, vagas_ocupadas=1)
        AgendaVaga.objects.create(unidade=self.unidade, tipo_servico=self.tipo, data=DIA, horario=time(12), vagas=1, vagas_ocupadas=1)
        dados = self.resultados()
        self.assertEqual(dados["vagas_livres"], [{"tipo_servico": "Consulta médica", "livres": 2, "horarios": ["11:00"]}])
        self.assertEqual(dados["resumo"]["vagas_livres"], 2)

    def test_fila_por_prioridade_e_urgencia(self):
        FilaEspera.objects.bulk_create([
            FilaEspera(cidadao=self.cidadao, servico=self.servico, unidade=self.unidade, prioridade="PREFERENCIAL+"),
            FilaEspera(cidadao=self.cidadao, servico=self.servico, unidade=self.unidade, prioridade="NORMAL", urgencia="ALTA"),
            FilaEspera(cidadao=self.cidadao, servico=self.servico, unidade=self.outra, prioridade="NORMAL"),
        ])
        fila = self.resultados()["fila"]
        self.assertEqual((fila["total"], fila["preferencial_80"], fila["urgentes"]), (2, 1, 1))
        self.assertEqual(fila["por_servico"], [{"servico_nome": "Consulta", "total": 2}])

    def test_lista_cadastros_incompletos_uma_vez_por_cidadao(self):
        self.agendamento("AGENDADO", time(11))
        self.agendamento("ATIVADO", time(9))
        incompletos = self.resultados()["cadastros_incompletos"]
        self.assertEqual(len(incompletos), 1)
        self.assertEqual(incompletos[0]["faltando"], ["telefone", "bairro", "CNS", "data de nascimento"])

    def test_acesso_por_perfil_e_lotacao(self):
        self.client.force_authenticate(self.medico)
        self.assertEqual(self.client.get(URL_RECEPCAO, {"unidade_id": str(self.unidade.id)}).status_code, 403)
        self.client.force_authenticate(self.de_fora)
        self.assertEqual(self.client.get(URL_RECEPCAO, {"unidade_id": str(self.unidade.id)}).status_code, 403)


class QualidadeDadosTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.admin = sla_tests.SupervisorSlaTests.usuario("administrador", "11144477735")
        cls.gestor = sla_tests.SupervisorSlaTests.usuario("gestor", "52998224725")
        cls.medico_incompleto = sla_tests.SupervisorSlaTests.usuario("Médico", "39053344705")
        cls.medico_ok = sla_tests.SupervisorSlaTests.usuario("Médico", "86288366757")
        cls.no_mapa = Bairro.objects.create(nome="Messejana")
        cls.inventado = Bairro.objects.create(nome="Bairro Que Não Existe")
        cls.unidade = UnidadePosto.objects.create(
            nome="Posto Sem Mapa", logradouro="Rua A", numero="1", cep="60000000", bairro=cls.no_mapa,
            telefone="8533333333", email="semmapa@posto.local",
        )
        cls.tipo_ok = TipoServico.objects.create(nome="Consulta médica", tempo_atendimento=20)
        TipoServico.objects.create(nome="Sem meta", tempo_atendimento=0)
        Medicamento.objects.create(**PAYLOAD)
        cls.medico_ok.unidades_lotacao.add(cls.unidade)
        cls.medico_ok.tipo_ofertados.add(cls.tipo_ok)
        EscalaTrabalho.objects.create(profissional=cls.medico_ok, unidade=cls.unidade, dias_semana=["SEG"])
        Cidadao.objects.create(nome="Sem bairro", cpf="15350946056")
        Cidadao.objects.create(nome="Completo", cpf="71428793860", bairro=cls.no_mapa, cns="123456789012345",
                               telefone="85999999999", data_nascimento=DIA.replace(year=1990))

    def verificacoes(self):
        client = APIClient()
        client.force_authenticate(self.admin)
        response = client.get(URL_QUALIDADE)
        self.assertEqual(response.status_code, 200, response.content)
        dados = response.json()["results"]
        return {v["chave"]: v for g in dados["grupos"] for v in g["verificacoes"]}, dados

    def test_aponta_o_que_falta_no_cadastro(self):
        v, dados = self.verificacoes()
        self.assertEqual((v["unidades_sem_coordenadas"]["total"], v["unidades_sem_abrangencia"]["total"]), (1, 1))
        self.assertEqual(v["unidades_sem_servico"]["total"], 1)
        self.assertEqual([i["nome"] for i in v["bairros_fora_do_mapa"]["itens"]], ["Bairro Que Não Existe"])
        self.assertEqual([i["nome"] for i in v["servicos_sem_meta"]["itens"]], ["Sem meta"])
        self.assertEqual(v["medicamentos_sem_minimo"]["total"], 1)
        self.assertEqual((v["cidadaos_sem_bairro"]["total"], v["cidadaos_sem_bairro"]["base"]), (1, 2))
        self.assertEqual(v["cidadaos_sem_bairro"]["pct"], 50)
        self.assertEqual(v["cidadaos_sem_cns"]["total"], 1)
        nomes = lambda chave: [i["nome"] for i in v[chave]["itens"]]
        self.assertEqual(nomes("profissionais_sem_lotacao"), [self.medico_incompleto.nome_completo])
        self.assertEqual(nomes("profissionais_sem_servico"), [self.medico_incompleto.nome_completo])
        self.assertEqual(nomes("profissionais_sem_escala"), [self.medico_incompleto.nome_completo])
        self.assertEqual(dados["pendencias"], sum(1 for item in v.values() if item["total"]))

    def test_so_o_administrador_acessa(self):
        client = APIClient()
        client.force_authenticate(self.gestor)
        self.assertEqual(client.get(URL_QUALIDADE).status_code, 403)
        client.force_authenticate(None)
        self.assertIn(client.get(URL_QUALIDADE).status_code, (401, 403))
