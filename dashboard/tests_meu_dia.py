from datetime import datetime, time
from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import Agendamento
from cidadaos.models import Cidadao
from medicamentos.models import Medicamento
from medicamentos.tests import PAYLOAD
from medicamentos.tests_estoque import criar_unidade
from prontuario.models import Receita, ReceitaMedicamento, RegistroAtendimento
from servicos.models import ClasseServico, Servico, TipoServico
from .tests import DIA
from . import tests as sla_tests


URL = "/api/v1/dashboard-profissional/"


class MeuDiaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.unidade = criar_unidade("Posto Meu Dia")
        cls.outra = criar_unidade("Posto Vizinho")
        cls.medico = sla_tests.SupervisorSlaTests.usuario("Médico", "11144477735")
        cls.colega = sla_tests.SupervisorSlaTests.usuario("Médico", "52998224725")
        cls.enfermeiro = sla_tests.SupervisorSlaTests.usuario("Enfermeiro", "39053344705")
        cls.supervisor = sla_tests.SupervisorSlaTests.usuario("Supervisor", "86288366757")
        classe = ClasseServico.objects.create(nome="Atenção Básica")
        cls.tipo = TipoServico.objects.create(nome="Consulta médica", tempo_atendimento=20)
        cls.outro_tipo = TipoServico.objects.create(nome="Vacinação", tempo_atendimento=10)
        cls.servico = Servico.objects.create(nome="Consulta clínica", classe=classe, tipo_servico=cls.tipo)
        cls.vacina = Servico.objects.create(nome="Vacina", classe=classe, tipo_servico=cls.outro_tipo)
        for usuario in (cls.medico, cls.colega, cls.enfermeiro, cls.supervisor):
            usuario.unidades_lotacao.add(cls.unidade)
        cls.medico.tipo_ofertados.add(cls.tipo)
        cls.enfermeiro.tipo_ofertados.add(cls.tipo)
        cls.cidadao = Cidadao.objects.create(nome="Paciente Meu Dia", cpf="15350946056")
        cls.medicamento = Medicamento.objects.create(**PAYLOAD)

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.medico)
        self.params = {"unidade_id": str(self.unidade.id), "data": str(DIA)}

    def agendamento(self, situacao, atendente=None, servico=None, inicio=None, fim=None, horario=time(9)):
        return Agendamento.objects.bulk_create([Agendamento(
            cidadao=self.cidadao, unidade=self.unidade, servico=servico or self.servico, atendente=atendente,
            data=DIA, horario=horario, situacao=situacao,
            data_hora_inicio_atendimento=inicio, data_hora_fim_atendimento=fim,
        )])[0]

    def cenario(self):
        self.minha_consulta = self.agendamento("FINALIZADO", self.medico, inicio=time(9), fim=time(9, 20))
        self.agendamento("ATIVADO", horario=time(9, 30))
        self.agendamento("AGENDADO", horario=time(10))
        self.agendamento("CANCELADO_CIDADAO", horario=time(10, 30))
        # Fora da agenda do médico: outro serviço e consulta de colega.
        self.agendamento("ATIVADO", servico=self.vacina)
        self.agendamento("FINALIZADO", self.colega, inicio=time(9), fim=time(9, 40))

    def resultados(self, usuario=None, **params):
        if usuario:
            self.client.force_authenticate(usuario)
        response = self.client.get(URL, {**self.params, **params})
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]

    def test_agenda_tem_so_os_servicos_do_profissional_e_os_atendimentos_dele(self):
        self.cenario()
        dados = self.resultados()
        self.assertEqual(dados["perfil"], "medico")
        self.assertEqual(dados["resumo"]["agendados"], 3)
        self.assertEqual(dados["resumo"]["aguardando"], 1)
        self.assertEqual(dados["resumo"]["a_chegar"], 1)
        self.assertEqual(dados["resumo"]["atendidos"], 1)
        self.assertEqual(dados["resumo"]["cancelados"], 1)
        self.assertEqual([item["horario"] for item in dados["agenda"]], ["09:00", "09:30", "10:00", "10:30"])
        self.assertEqual(dados["agenda"][0]["duracao_min"], 20)

    def test_meus_tempos_tem_a_unidade_como_referencia(self):
        self.cenario()
        dados = self.resultados()
        self.assertEqual(dados["meus_tempos"]["tempo_medio_atendimento_min"], 20)
        self.assertEqual(dados["meus_tempos"]["pct_dentro_meta"], 100)
        self.assertEqual(dados["tempos_unidade"]["tempo_medio_atendimento_min"], 30)
        self.assertEqual(dados["serie"][-1], {
            "data": str(DIA), "consultas": 1, "tempo_medio_atendimento_min": 20,
            "tempo_medio_esperado_min": 20, "pct_dentro_meta": 100,
        })
        self.assertEqual(len(dados["serie"]), 30)
        self.assertIsNone(dados["serie"][0]["tempo_medio_atendimento_min"])

    def test_espera_so_e_calculada_para_quem_aguarda_hoje(self):
        self.cenario()
        self.assertIsNone(self.resultados()["resumo"]["maior_espera_min"])
        agora = timezone.make_aware(datetime.combine(DIA, time(9, 45)))
        with patch("django.utils.timezone.now", return_value=agora):
            dados = self.resultados()
        # Marcado para 09:30 e ainda aguardando às 09:45.
        self.assertEqual(dados["resumo"]["maior_espera_min"], 15)

    def test_medico_ve_risco_cid_e_prescricoes(self):
        self.cenario()
        RegistroAtendimento.objects.create(
            agendamento=self.minha_consulta, cidadao=self.cidadao, unidade=self.unidade, profissional=self.medico,
            queixa_principal="Dor de cabeça", classificacao_risco="AMARELO", cid="R51",
        )
        receita = Receita.objects.create(agendamento=self.minha_consulta, cidadao=self.cidadao, profissional=self.medico)
        Receita.objects.filter(pk=receita.pk).update(data_emissao=timezone.make_aware(datetime.combine(DIA, time(9, 20))))
        ReceitaMedicamento.objects.create(receita=receita, medicamento=self.medicamento, nome="Dipirona",
                                          dosagem="500 mg", frequencia="8h", duracao="3 dias", quantidade_prescrita=10)
        Agendamento.objects.filter(pk=self.minha_consulta.pk).update(retirar_medicamento=True)
        dados = self.resultados()
        riscos = {r["classificacao"]: r["total"] for r in dados["classificacao_risco"]}
        self.assertEqual(riscos["AMARELO"], 1)
        self.assertEqual(sum(riscos.values()), 1)
        self.assertEqual(dados["cids"], [{"cid": "R51", "total": 1}])
        self.assertEqual(dados["prescricao"]["receitas_total"], 1)
        self.assertEqual(dados["prescricao"]["receitas_retirada_imediata"], 1)
        self.assertEqual(dados["prescricao"]["medicamentos"], [{"nome": "Dipirona 500 mg", "receitas": 1}])
        self.assertIsNone(dados["triagem"])

    def test_enfermeiro_ve_triagem_e_nao_prescricao(self):
        consulta = self.agendamento("FINALIZADO", self.enfermeiro, inicio=time(9), fim=time(9, 10))
        RegistroAtendimento.objects.create(
            agendamento=consulta, cidadao=self.cidadao, unidade=self.unidade, profissional=self.enfermeiro,
            queixa_principal="Triagem", pressao_sistolica=150, pressao_diastolica=85, glicemia_capilar=110,
        )
        dados = self.resultados(self.enfermeiro)
        self.assertEqual(dados["perfil"], "enfermeiro")
        self.assertEqual(dados["triagem"], {"registros_com_sinais": 1, "pressao_elevada": 1, "glicemia_alta": 0, "febre": 0})
        self.assertIsNone(dados["prescricao"])
        self.assertIsNone(dados["cids"])

    def test_nao_mostra_dados_de_outro_profissional(self):
        self.cenario()
        dados = self.resultados(self.colega)
        # O colega não oferece nenhum tipo de serviço: só enxerga a própria consulta.
        self.assertEqual([item["horario"] for item in dados["agenda"]], ["09:00"])
        self.assertEqual(dados["meus_tempos"]["tempo_medio_atendimento_min"], 40)

    def test_acesso_restrito_ao_profissional_lotado(self):
        self.client.force_authenticate(self.supervisor)
        self.assertEqual(self.client.get(URL, self.params).status_code, 403)
        self.client.force_authenticate(self.medico)
        self.assertEqual(self.client.get(URL, {**self.params, "unidade_id": str(self.outra.id)}).status_code, 403)
        self.assertEqual(self.client.get(URL, {**self.params, "unidade_id": "invalido"}).status_code, 400)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(URL, self.params).status_code, (401, 403))
