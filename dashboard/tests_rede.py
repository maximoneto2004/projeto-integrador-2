from datetime import date, time, timedelta

from django.test import TestCase
from rest_framework.test import APIClient

from agendamentos.models import AgendaVaga, Agendamento
from cidadaos.models import Cidadao
from medicamentos.models import Medicamento
from medicamentos.tests import PAYLOAD
from medicamentos.tests_estoque import criar_unidade
from servicos.models import ClasseServico, Servico, TipoServico
from .tests import DIA
from . import rede
from . import tests as sla_tests


URL = "/api/v1/dashboard-gestor/"


class PainelDaRedeTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.unidade = criar_unidade("Posto Rede")
        cls.gestor = sla_tests.SupervisorSlaTests.usuario("gestor", "52998224725")
        cls.medico = sla_tests.SupervisorSlaTests.usuario("Médico", "11144477735")
        # 70 anos completos em DIA.
        cls.cidadao = Cidadao.objects.create(nome="Paciente Rede", cpf="15350946056", data_nascimento=date(1956, 1, 10))
        cls.tipo = TipoServico.objects.create(nome="Consulta médica", tempo_atendimento=20)
        cls.servico = Servico.objects.create(nome="Consulta", classe=ClasseServico.objects.create(nome="Básica"), tipo_servico=cls.tipo)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.gestor)

    def agendamento(self, situacao, dia=DIA, fim=time(9, 20)):
        encerrado = situacao == "FINALIZADO"
        return Agendamento.objects.bulk_create([Agendamento(
            cidadao=self.cidadao, unidade=self.unidade, servico=self.servico, atendente=self.medico,
            data=dia, horario=time(9), situacao=situacao,
            data_hora_inicio_atendimento=time(9) if encerrado else None,
            data_hora_fim_atendimento=fim if encerrado else None,
        )])[0]

    def resultados(self, inicio=DIA, fim=DIA):
        response = self.client.get(URL, {"data_inicio": str(inicio), "data_fim": str(fim)})
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]

    def test_comparativo_usa_o_mesmo_numero_de_dias_imediatamente_antes(self):
        self.agendamento("FINALIZADO")
        self.agendamento("AUSENCIA_CIDADAO")
        anterior = DIA - timedelta(days=1)
        self.agendamento("FINALIZADO", dia=anterior, fim=time(9, 40))
        dados = self.resultados()
        comparativo = dados["comparativo"]
        self.assertEqual((comparativo["anterior_inicio"], comparativo["anterior_fim"]), (str(anterior), str(anterior)))
        self.assertEqual(comparativo["atual"]["consultas"], 1)
        self.assertEqual(comparativo["atual"]["absenteismo"], 50)
        self.assertEqual(comparativo["atual"]["pct_dentro_meta"], 100)
        self.assertEqual(comparativo["anterior"]["consultas"], 1)
        self.assertEqual(comparativo["anterior"]["absenteismo"], 0)
        self.assertEqual(comparativo["anterior"]["pct_dentro_meta"], 0)
        # O topo do painel e o resumo geral contam do mesmo jeito.
        self.assertEqual(comparativo["atual"]["absenteismo"], dados["taxa_nao_comparecimento"])

    def test_serie_tem_doze_semanas_terminando_na_semana_do_filtro(self):
        self.agendamento("FINALIZADO")
        self.agendamento("FINALIZADO", dia=DIA - timedelta(weeks=3))
        serie = self.resultados()["serie_semanal"]
        self.assertEqual(len(serie), 12)
        self.assertEqual(serie[-1]["semana"], str(DIA - timedelta(days=DIA.weekday())))
        self.assertEqual(serie[-1]["consultas"], 1)
        self.assertEqual(serie[-4]["consultas"], 1)
        self.assertIsNone(serie[0]["absenteismo"])

    def test_demanda_e_capacidade_por_tipo_de_servico(self):
        AgendaVaga.objects.create(unidade=self.unidade, tipo_servico=self.tipo, data=DIA, horario=time(9), vagas=5, vagas_ocupadas=2)
        self.agendamento("FINALIZADO")
        self.agendamento("AGENDADO")
        self.agendamento("CANCELADO_CIDADAO")
        dados = self.resultados()
        self.assertEqual(dados["demanda_capacidade"], [{"tipo_servico": "Consulta médica", "vagas": 5, "agendamentos": 2}])
        linha = dados["informacoes_unidade"][0]
        self.assertEqual(linha["ocupacao"], 40)
        self.assertEqual(linha["consultas"], 1)

    def test_faixa_etaria_conta_consultas_encerradas(self):
        self.agendamento("FINALIZADO")
        self.agendamento("AUSENCIA_CIDADAO")
        faixas = {f["faixa"]: f["consultas"] for f in self.resultados()["faixa_etaria"]}
        self.assertEqual(faixas["60 a 79 anos"], 1)
        self.assertEqual(sum(faixas.values()), 1)

    def test_rupturas_contam_medicamentos_abaixo_do_minimo_por_unidade(self):
        Medicamento.objects.create(**PAYLOAD, estoque_minimo=10)
        self.agendamento("FINALIZADO")
        dados = self.resultados()
        self.assertEqual(dados["rupturas"], 1)
        self.assertEqual(dados["informacoes_unidade"][0]["rupturas"], 1)

    def test_idade_considera_se_o_aniversario_ja_passou(self):
        self.assertEqual(rede.idade(date(2000, 10, 29), DIA), 25)
        self.assertEqual(rede.idade(date(2000, 10, 28), DIA), 26)
