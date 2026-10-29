from datetime import time

from django.test import TestCase
from rest_framework.test import APIClient

from agendamentos.models import Agendamento
from app.models import Bairro
from cidadaos.models import Cidadao
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import UnidadePosto
from .mapa_bairros import normalizar_nome_geo
from .tests import DIA
from . import tests as sla_tests


URL = "/api/v1/mapa/bairros/indicadores/"


class IndicadoresPorBairroTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.messejana = Bairro.objects.create(nome="Messejana")
        cls.centro = Bairro.objects.create(nome="Centro")
        cls.sem_posto = Bairro.objects.create(nome="José de Alencar")
        cls.unidade = UnidadePosto.objects.create(
            nome="Posto Messejana", logradouro="Rua A", numero="1", cep="60000000", bairro=cls.messejana,
            telefone="8533333333", email="messejana@posto.local",
        )
        cls.unidade.bairros_abrangencia.add(cls.messejana)
        cls.gestor = sla_tests.SupervisorSlaTests.usuario("gestor", "52998224725")
        cls.medico = sla_tests.SupervisorSlaTests.usuario("Médico", "11144477735")
        cls.morador = Cidadao.objects.create(nome="Morador", cpf="15350946056", bairro=cls.messejana,
                                             condicoes_cronicas="Hipertensão")
        cls.visitante = Cidadao.objects.create(nome="Visitante", cpf="39053344705", bairro=cls.centro)
        cls.servico = Servico.objects.create(
            nome="Consulta", classe=ClasseServico.objects.create(nome="Básica"),
            tipo_servico=TipoServico.objects.create(nome="Consulta médica", tempo_atendimento=20),
        )

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.gestor)

    def agendamento(self, cidadao, situacao):
        encerrado = situacao == "FINALIZADO"
        Agendamento.objects.bulk_create([Agendamento(
            cidadao=cidadao, unidade=self.unidade, servico=self.servico, atendente=self.medico,
            data=DIA, horario=time(9), situacao=situacao,
            data_hora_inicio_atendimento=time(9) if encerrado else None,
            data_hora_fim_atendimento=time(9, 20) if encerrado else None,
        )])

    def bairros(self):
        response = self.client.get(URL, {"data_inicio": str(DIA), "data_fim": str(DIA)})
        self.assertEqual(response.status_code, 200, response.content)
        return {b["nome"]: b for b in response.json()["results"]["bairros"]}

    def test_conta_pelo_bairro_de_residencia_do_paciente(self):
        self.agendamento(self.morador, "FINALIZADO")
        self.agendamento(self.morador, "FINALIZADO")
        self.agendamento(self.morador, "AUSENCIA_CIDADAO")
        dados = self.bairros()["Messejana"]
        self.assertEqual((dados["agendamentos"], dados["consultas"], dados["pacientes"]), (3, 2, 1))
        self.assertEqual(dados["absenteismo"], 33.33)
        self.assertEqual(dados["base_absenteismo"], 3)
        self.assertEqual(dados["pacientes_cronicos"], 1)
        self.assertEqual(dados["unidades_referencia"], [{"id": str(self.unidade.id), "nome": "Posto Messejana"}])
        self.assertEqual(dados["pct_fora_territorio"], 0)

    def test_atendimento_fora_do_territorio(self):
        self.agendamento(self.visitante, "FINALIZADO")
        dados = self.bairros()["Centro"]
        self.assertEqual(dados["consultas_fora_territorio"], 1)
        self.assertEqual(dados["pct_fora_territorio"], 100)
        self.assertEqual(dados["atendidos_em"], [{"unidade": "Posto Messejana", "consultas": 1}])
        self.assertEqual(dados["unidades_referencia"], [])

    def test_bairro_sem_dados_aparece_para_a_cobertura(self):
        dados = self.bairros()["José de Alencar"]
        self.assertEqual(dados["agendamentos"], 0)
        self.assertIsNone(dados["absenteismo"])
        self.assertIsNone(dados["pct_fora_territorio"])
        self.assertEqual(dados["chave"], "jose de alencar")

    def test_normalizacao_casa_com_os_nomes_do_geojson(self):
        self.assertEqual(normalizar_nome_geo("  Vila  União "), "vila uniao")
        self.assertEqual(normalizar_nome_geo("Dom Lustosa/Autran Nunes"), "dom lustosa autran nunes")

    def test_acesso_restrito_a_gestao(self):
        self.client.force_authenticate(self.medico)
        self.assertEqual(self.client.get(URL).status_code, 403)
        self.client.force_authenticate(self.gestor)
        self.assertEqual(self.client.get(URL, {"data_inicio": "2026-10-29", "data_fim": "2026-10-01"}).status_code, 400)
