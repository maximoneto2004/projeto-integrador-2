from datetime import datetime, time, timedelta
from uuid import uuid4

from django.contrib.auth.models import Permission
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import Agendamento
from cidadaos.models import Cidadao
from medicamentos.models import Medicamento
from medicamentos.tests import PAYLOAD
from medicamentos.tests_estoque import criar_unidade
from prontuario.models import Receita, ReceitaMedicamento
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import ServicoUnidadePosto
from .mapa_assistencial import analise_por_unidade
from .tests import DIA
from . import tests as sla_tests


URL_CALOR = "/api/v1/mapa/medicamentos/"
URL_UNIDADES = "/api/v1/mapa_unidades/"


class MapaAssistencialTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.unidade = criar_unidade("Posto Centro")
        cls.outra = criar_unidade("Posto Sul")
        cls.gestor = sla_tests.SupervisorSlaTests.usuario("gestor", "52998224725")
        cls.medico = sla_tests.SupervisorSlaTests.usuario("Médico", "11144477735")
        cls.admin = sla_tests.SupervisorSlaTests.usuario("administrador", "39053344705")
        cls.admin.is_superuser = True
        cls.admin.save()
        view = Permission.objects.get(content_type__app_label="unidade_posto", codename="view_unidadeposto")
        cls.gestor.user_permissions.add(view)
        cls.medico.user_permissions.add(view)
        cls.cidadao = Cidadao.objects.create(nome="Paciente de teste", cpf="15350946056", unidade_origem=cls.outra)
        cls.servico = Servico.objects.create(nome="Consulta médica", classe=ClasseServico.objects.create(nome="Consultas"),
            tipo_servico=TipoServico.objects.create(nome="Clínica geral", tempo_atendimento=20))
        ServicoUnidadePosto.objects.create(unidade=cls.unidade, servico=cls.servico, dias_semana=[1, 2, 3, 4, 5])
        cls.medicamento = Medicamento.objects.create(**PAYLOAD)
        cls.outro_med = Medicamento.objects.create(**{**PAYLOAD, "concentracao": "1000"})

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.gestor)
        self.params = {"data_inicio": str(DIA), "data_fim": str(DIA)}

    def atendimento(self, **kwargs):
        valores = dict(cidadao=self.cidadao, unidade=self.unidade, servico=self.servico, atendente=self.medico,
            data=DIA, horario=time(9), situacao="FINALIZADO",
            data_hora_inicio_atendimento=time(9), data_hora_fim_atendimento=time(9, 20))
        return Agendamento.objects.bulk_create([Agendamento(**{**valores, **kwargs})])[0]

    def receita(self, unidade=None, data=None, quantidade=30, medicamento=None, **kwargs):
        agendamento = self.atendimento(unidade=unidade or self.unidade)
        receita = Receita.objects.create(agendamento=agendamento, cidadao=self.cidadao, profissional=self.medico)
        emissao = timezone.make_aware(datetime.combine(data or DIA, time(23, 55)))
        Receita.objects.filter(pk=receita.pk).update(data_emissao=emissao)
        item = ReceitaMedicamento.objects.create(receita=receita, medicamento=medicamento or self.medicamento,
            nome="Dipirona", dosagem="500 mg", frequencia="8h", duracao="3 dias", quantidade_prescrita=quantidade, **kwargs)
        return receita, item

    def calor(self, **params):
        response = self.client.get(URL_CALOR, {**self.params, **params})
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]

    def test_receitas_medem_demanda_da_unidade_que_prescreveu(self):
        self.receita(quantidade=100)
        self.receita(quantidade=5)
        self.receita(unidade=self.outra, quantidade=200)
        dados = self.calor(medicamento_id=str(self.medicamento.id))
        pontos = {p["unidade_id"]: p for p in dados["unidades"]}
        self.assertEqual(pontos[str(self.unidade.id)]["solicitacoes"], 2)
        self.assertEqual(pontos[str(self.unidade.id)]["quantidade_prescrita"], 105)
        self.assertEqual(pontos[str(self.outra.id)]["solicitacoes"], 1)
        self.assertEqual(dados["total_solicitacoes"], 3)
        self.assertEqual(dados["maior_demanda"], 2)
        self.assertNotIn(self.cidadao.nome, str(dados))
        self.assertNotIn(self.cidadao.cpf, str(dados))

    def test_apresentacoes_sao_separadas_e_catalogo_sem_demanda_continua_disponivel(self):
        self.receita()
        dados = self.calor(medicamento_id=str(self.outro_med.id))
        self.assertEqual(dados["total_solicitacoes"], 0)
        self.assertEqual(len(dados["medicamentos"]), 2)
        self.assertEqual(len(dados["unidades"]), 2)
        self.assertEqual(dados["medicamento"]["concentracao"], "1000")

    def test_receita_duplicada_nao_duplica_contagem_de_solicitacoes(self):
        receita, _ = self.receita()
        ReceitaMedicamento.objects.create(receita=receita, medicamento=self.medicamento, nome="Dipirona",
            dosagem="500 mg", frequencia="8h", duracao="3 dias", quantidade_prescrita=10)
        self.assertEqual(self.calor()["total_solicitacoes"], 1)

    def test_periodo_usa_emissao_local_da_receita_e_preserva_dispensacao_separada(self):
        self.receita(quantidade=20, quantidade_dispensada=8)
        self.receita(data=DIA - timedelta(days=1))
        dados = self.calor(medicamento_id=str(self.medicamento.id))
        ponto = next(p for p in dados["unidades"] if p["unidade_id"] == str(self.unidade.id))
        self.assertEqual(ponto["solicitacoes"], 1)
        self.assertEqual(ponto["quantidade_prescrita"], 20)
        self.assertEqual(ponto["quantidade_dispensada"], 8)

    def test_oferta_sem_consulta_tem_media_nula_e_detalhe_informa_endereco(self):
        response = self.client.get(f"{URL_UNIDADES}{self.unidade.id}/", self.params)
        self.assertEqual(response.status_code, 200, response.content)
        unidade = response.json()["result"]
        self.assertEqual(unidade["logradouro"], "Rua A")
        servico = unidade["analise"]["servicos"][0]
        self.assertTrue(servico["ofertado"])
        self.assertIsNone(servico["media_min"])
        self.assertEqual(servico["concluidos"], 0)

    def test_servicos_usam_sla_completo_e_ignoram_duracao_invalida(self):
        inicio = timezone.make_aware(datetime.combine(DIA, time(23, 50)))
        self.atendimento(inicio_atendimento_em=inicio, fim_atendimento_em=inicio + timedelta(minutes=30),
            data_hora_inicio_atendimento=time(23, 50), data_hora_fim_atendimento=time(0, 20), situacao="AGUARDANDO_RETIRADA")
        self.atendimento(data_hora_fim_atendimento=time(8))
        dados = analise_por_unidade([self.unidade.id], DIA, DIA)[str(self.unidade.id)]["servicos"][0]
        self.assertEqual(dados["media_min"], 30)
        self.assertEqual(dados["concluidos"], 2)
        self.assertEqual(dados["medidos"], 1)

    def test_servico_do_historico_e_preservado_sem_oferta_atual(self):
        ServicoUnidadePosto.objects.filter(unidade=self.unidade).update(is_active=False)
        self.atendimento(data_hora_fim_atendimento=time(9))
        dados = analise_por_unidade([self.unidade.id], DIA, DIA)[str(self.unidade.id)]["servicos"][0]
        self.assertFalse(dados["ofertado"])
        self.assertEqual(dados["media_min"], 0)

    def test_media_da_unidade_e_ponderada_pelo_numero_de_consultas(self):
        outro = Servico.objects.create(nome="Avaliação especializada", classe=self.servico.classe,
            tipo_servico=TipoServico.objects.create(nome="Especialidade", tempo_atendimento=40))
        self.atendimento(data_hora_fim_atendimento=time(9, 10))
        self.atendimento(data_hora_fim_atendimento=time(9, 20))
        self.atendimento(servico=outro, data_hora_fim_atendimento=time(10))
        analise = analise_por_unidade([self.unidade.id], DIA, DIA)[str(self.unidade.id)]
        self.assertEqual(analise["media_min"], 30)
        self.assertEqual(analise["medidos"], 3)

    def test_demanda_nao_usa_a_data_do_agendamento(self):
        receita, _ = self.receita()
        Agendamento.objects.filter(pk=receita.agendamento_id).update(data=DIA - timedelta(days=5))
        self.assertEqual(self.calor()["total_solicitacoes"], 1)

    def test_legados_sem_catalogo_e_sem_quantidade_nao_sao_inventados(self):
        _, item = self.receita(quantidade=None)
        _, legado = self.receita()
        ReceitaMedicamento.objects.filter(pk=legado.pk).update(medicamento=None)
        analise = analise_por_unidade([self.unidade.id], DIA, DIA)[str(self.unidade.id)]
        self.assertEqual(analise["itens_legados_sem_catalogo"], 1)
        self.assertIsNone(analise["medicamentos"][0]["quantidade_prescrita"])
        self.assertEqual(analise["medicamentos"][0]["itens_sem_quantidade"], 1)
        self.assertEqual(self.calor()["total_solicitacoes"], 1)

    def test_registros_inativos_sao_excluidos_e_medicamento_historico_mantido(self):
        receita, _ = self.receita()
        Receita.objects.filter(pk=receita.pk).update(is_active=False)
        self.receita(medicamento=self.outro_med)
        Medicamento.objects.filter(pk=self.outro_med.pk).update(is_active=False)
        dados = self.calor()
        self.assertEqual(dados["total_solicitacoes"], 1)
        self.assertEqual(dados["medicamento"]["id"], str(self.outro_med.id))
        self.outra.is_active = False
        self.outra.save()
        self.assertEqual(len(self.calor()["unidades"]), 1)

    def test_selecao_historica_sem_demanda_no_periodo_permanece_disponivel(self):
        Medicamento.objects.filter(pk=self.outro_med.id).update(is_active=False)
        dados = self.calor(medicamento_id=str(self.outro_med.id))
        self.assertEqual(dados["medicamento"]["id"], str(self.outro_med.id))
        self.assertEqual(dados["total_solicitacoes"], 0)

    def test_perfil_medico_nao_recebe_analise_nem_acessa_calor(self):
        self.client.force_authenticate(self.medico)
        self.assertEqual(self.client.get(URL_CALOR, self.params).status_code, 403)
        response = self.client.get(f"{URL_UNIDADES}{self.unidade.id}/", self.params)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertIsNone(response.json()["result"]["analise"])

    def test_gestor_precisa_da_permissao_e_administrador_acessa(self):
        view = Permission.objects.get(content_type__app_label="unidade_posto", codename="view_unidadeposto")
        self.gestor.user_permissions.remove(view)
        self.gestor.groups.first().permissions.remove(view)
        self.assertEqual(self.client.get(URL_CALOR, self.params).status_code, 403)
        self.client.force_authenticate(self.admin)
        self.assertEqual(self.client.get(URL_CALOR, self.params).status_code, 200)
        self.client.force_authenticate(None)
        self.assertIn(self.client.get(URL_CALOR, self.params).status_code, (401, 403))

    def test_filtros_invalidos_sao_rejeitados(self):
        for params in [{"data_inicio": "invalida"}, {"data_fim": "2026-10-27"}, {"medicamento_id": "nao-uuid"}]:
            self.assertEqual(self.client.get(URL_CALOR, {**self.params, **params}).status_code, 400)
        self.assertEqual(self.client.get(URL_CALOR, {**self.params, "medicamento_id": str(uuid4())}).status_code, 404)
        self.assertEqual(self.client.get(URL_UNIDADES, {**self.params, "data_fim": "2026-10-27"}).status_code, 400)

    def test_consultas_sao_constantes_e_lista_recebe_analise(self):
        self.receita()
        with self.assertNumQueries(4):
            dados = analise_por_unidade([self.unidade.id, self.outra.id], DIA, DIA)
        self.assertEqual(len(dados), 2)
        response = self.client.get(URL_UNIDADES, self.params)
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(len(response.json()["result"]), 2)
        unidade = next(u for u in response.json()["result"] if u["id"] == str(self.unidade.id))
        self.assertEqual(unidade["analise"]["medicamentos"][0]["solicitacoes"], 1)
