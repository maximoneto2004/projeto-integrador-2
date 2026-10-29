from datetime import datetime, time, timedelta
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import Agendamento
from cidadaos.models import Cidadao
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from medicamentos.tests import PAYLOAD
from medicamentos.tests_estoque import criar_unidade
from prontuario.models import Receita, ReceitaMedicamento
from servicos.models import ClasseServico, Servico, TipoServico
from . import tests as sla_tests


URL = "/api/v1/dashboard-farmacia/"


class FarmaciaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.unidade = criar_unidade("Posto Farmácia")
        cls.outra = criar_unidade("Posto Distante")
        cls.farmaceutico = sla_tests.SupervisorSlaTests.usuario("Farmacêutico", "11144477735")
        cls.supervisor = sla_tests.SupervisorSlaTests.usuario("Supervisor", "52998224725")
        cls.medico = sla_tests.SupervisorSlaTests.usuario("Médico", "39053344705")
        cls.de_fora = sla_tests.SupervisorSlaTests.usuario("Farmacêutico", "86288366757")
        for usuario in (cls.farmaceutico, cls.supervisor, cls.medico):
            usuario.unidades_lotacao.add(cls.unidade)
        cls.de_fora.unidades_lotacao.add(cls.outra)
        cls.cidadao = Cidadao.objects.create(nome="Paciente da Farmácia", cpf="15350946056")
        cls.servico = Servico.objects.create(
            nome="Consulta", classe=ClasseServico.objects.create(nome="Básica"),
            tipo_servico=TipoServico.objects.create(nome="Consulta médica", tempo_atendimento=20),
        )
        cls.dipirona = Medicamento.objects.create(**PAYLOAD, estoque_minimo=50)
        cls.sem_estoque = Medicamento.objects.create(**{**PAYLOAD, "concentracao": "1000"})

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.farmaceutico)
        # Meio da tarde: as janelas de horas dos testes não atravessam a meia-noite.
        self.hoje = timezone.localdate()
        self.agora = timezone.make_aware(datetime.combine(self.hoje, time(15)))

    def consulta(self, situacao="FINALIZADO", fim=None, retirar=False):
        fim = fim or self.agora - timedelta(minutes=30)
        return Agendamento.objects.bulk_create([Agendamento(
            cidadao=self.cidadao, unidade=self.unidade, servico=self.servico, atendente=self.medico,
            data=self.hoje, horario=time(8), situacao=situacao, retirar_medicamento=retirar,
            inicio_atendimento_em=fim - timedelta(minutes=20), fim_atendimento_em=fim,
        )])[0]

    def item(self, agendamento, medicamento, prescrito, dispensado, status):
        receita = Receita.objects.create(agendamento=agendamento, cidadao=self.cidadao, profissional=self.medico)
        return ReceitaMedicamento.objects.create(
            receita=receita, medicamento=medicamento, nome=medicamento.nome, dosagem="500 mg", frequencia="8h",
            duracao="3 dias", quantidade_prescrita=prescrito, quantidade_dispensada=dispensado, status_dispensacao=status,
        )

    def estoque(self):
        lote = LoteMedicamento.objects.create(
            medicamento=self.dipirona, unidade=self.unidade, numero_lote="L1",
            validade=self.hoje + timedelta(days=20), quantidade_inicial=50, quantidade_atual=20,
        )
        LoteMedicamento.objects.create(
            medicamento=self.dipirona, unidade=self.unidade, numero_lote="VENCIDO",
            validade=self.hoje - timedelta(days=1), quantidade_inicial=5, quantidade_atual=5,
        )
        return lote

    def saida(self, lote, quantidade, quando, item=None):
        MovimentacaoEstoque.objects.create(
            lote=lote, tipo="SAIDA", quantidade=-quantidade, saldo_apos=lote.quantidade_atual, data=quando, receita_item=item,
        )

    def resultados(self, usuario=None):
        if usuario:
            self.client.force_authenticate(usuario)
        with patch("django.utils.timezone.now", return_value=self.agora):
            response = self.client.get(URL, {"unidade_id": str(self.unidade.id)})
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]

    def test_fila_mede_a_espera_desde_o_fim_da_consulta(self):
        self.consulta("AGUARDANDO_RETIRADA", fim=self.agora - timedelta(minutes=15), retirar=True)
        self.consulta("CHAMANDO_RETIRADA", fim=self.agora - timedelta(minutes=5), retirar=True)
        self.consulta("FINALIZADO")
        dados = self.resultados()
        self.assertEqual(dados["resumo"]["fila_retirada"], 2)
        self.assertEqual(dados["resumo"]["chamando"], 1)
        self.assertEqual(dados["resumo"]["maior_espera_min"], 15)
        self.assertEqual([item["espera_min"] for item in dados["fila"]], [15, 5])

    def test_tempo_ate_dispensacao_vai_do_fim_da_consulta_a_primeira_saida(self):
        lote = self.estoque()
        fim = self.agora - timedelta(hours=1)
        consulta = self.consulta(fim=fim, retirar=True)
        item = self.item(consulta, self.dipirona, 10, 10, "DISPENSADO")
        self.saida(lote, 6, fim + timedelta(minutes=12), item)
        self.saida(lote, 4, fim + timedelta(minutes=40), item)
        dados = self.resultados()
        self.assertEqual(dados["tempo_ate_dispensacao"], {"atendidos": 1, "tempo_medio_min": 12.0})
        self.assertEqual(dados["resumo"]["receitas_atendidas_hoje"], 1)

    def test_cobertura_usa_o_consumo_dos_ultimos_30_dias(self):
        lote = self.estoque()
        self.saida(lote, 30, self.agora - timedelta(days=2))
        # Saída antiga, fora da janela de 30 dias.
        self.saida(lote, 100, self.agora - timedelta(days=45))
        dados = self.resultados()
        linha = next(l for l in dados["cobertura"] if l["medicamento_id"] == str(self.dipirona.id))
        self.assertEqual(linha["consumo_30d"], 30)
        self.assertEqual(linha["saldo_disponivel"], 20)
        self.assertEqual(linha["saldo_vencido"], 5)
        self.assertEqual(linha["dias_cobertura"], 20)
        self.assertFalse(linha["em_alerta"])
        self.assertEqual(dados["resumo"]["medicamentos_abaixo_minimo"], 1)
        self.assertEqual(dados["resumo"]["lotes_vencendo"], 1)
        self.assertEqual(dados["resumo"]["lotes_vencidos"], 1)
        self.assertEqual(dados["saidas_diarias"]["medicamentos"][0]["id"], str(self.dipirona.id))
        self.assertEqual(sum(dia[str(self.dipirona.id)] for dia in dados["saidas_diarias"]["dias"]), 30)

    def test_ruptura_so_quando_o_estoque_nao_cobre_o_que_falta(self):
        self.estoque()
        consulta = self.consulta()
        # Faltam 10 de Dipirona e há 20 em estoque: não é ruptura.
        self.item(consulta, self.dipirona, 40, 30, "PARCIAL")
        self.item(consulta, self.sem_estoque, 15, 0, "PENDENTE")
        self.item(consulta, self.dipirona, 10, 10, "DISPENSADO")
        dados = self.resultados()
        self.assertEqual([r["medicamento_id"] for r in dados["rupturas"]], [str(self.sem_estoque.id)])
        self.assertEqual(dados["rupturas"][0]["quantidade_faltante"], 15)
        receitas = dados["itens_receita"]
        self.assertEqual((receitas["total"], receitas["dispensados"], receitas["parciais"], receitas["pendentes"]), (3, 1, 1, 1))
        self.assertEqual(receitas["pct_integral"], 33.3)

    def test_validade_agrupa_os_lotes_por_mes(self):
        self.estoque()
        dados = self.resultados()
        self.assertEqual(dados["validade"]["vencidos"], {"lotes": 1, "quantidade": 5})
        self.assertEqual(sum(m["quantidade"] for m in dados["validade"]["meses"]), 20)

    def test_acesso_por_perfil_e_lotacao(self):
        self.assertEqual(self.client.get(URL, {"unidade_id": str(self.unidade.id)}).status_code, 200)
        self.client.force_authenticate(self.supervisor)
        self.assertEqual(self.client.get(URL, {"unidade_id": str(self.unidade.id)}).status_code, 200)
        self.client.force_authenticate(self.medico)
        self.assertEqual(self.client.get(URL, {"unidade_id": str(self.unidade.id)}).status_code, 403)
        self.client.force_authenticate(self.de_fora)
        self.assertEqual(self.client.get(URL, {"unidade_id": str(self.unidade.id)}).status_code, 403)
        self.assertEqual(self.client.get(URL, {"unidade_id": "invalido"}).status_code, 400)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(URL, {"unidade_id": str(self.unidade.id)}).status_code, (401, 403))
