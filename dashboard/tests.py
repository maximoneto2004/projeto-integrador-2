from datetime import date, datetime, time, timedelta
from unittest.mock import patch

from django.contrib.auth.models import Group, Permission
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import AgendaVaga, Agendamento
from agendamentos.serializers import AgendamentoSerializer
from app.models import Bairro
from cidadaos.models import Cidadao
from prontuario.serializers import ReceitaSerializer
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import UnidadePosto
from usuarios.models import Usuario
from .sla import resumo_sla


DIA = date(2026, 10, 28)
URL_RESUMO = "/api/v1/dashboard-supervisor/"
URL_LISTA = URL_RESUMO + "atendimentos/"


class SupervisorSlaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        bairro = Bairro.objects.create(nome="Centro")
        cls.unidade = UnidadePosto.objects.create(
            nome="Unidade Centro", bairro=bairro, logradouro="Rua A", numero="1",
            cep="60000000", telefone="8533333333", email="centro@teste.local",
        )
        cls.outra_unidade = UnidadePosto.objects.create(
            nome="Unidade Sul", bairro=bairro, logradouro="Rua B", numero="2",
            cep="60000000", telefone="8533333333", email="sul@teste.local",
        )
        cls.supervisor = cls.usuario("Supervisor", "52998224725")
        cls.medico = cls.usuario("Médico", "11144477735")
        cls.enfermeiro = cls.usuario("Enfermeiro", "39053344705")
        cls.coordenador = cls.usuario("coordenador", "86288366757")
        cls.supervisor.unidades_lotacao.add(cls.unidade)
        cls.coordenador.unidades_lotacao.add(cls.unidade)
        cls.cidadao = Cidadao.objects.create(nome="Maria Silva", cpf="15350946056")
        classe = ClasseServico.objects.create(nome="Atenção Básica")
        cls.servico = Servico.objects.create(
            nome="Consulta clínica", classe=classe,
            tipo_servico=TipoServico.objects.create(nome="Consulta médica", tempo_atendimento=20),
        )
        cls.outro_servico = Servico.objects.create(
            nome="Avaliação", classe=classe,
            tipo_servico=TipoServico.objects.create(nome="Avaliação médica", tempo_atendimento=30),
        )

    @staticmethod
    def usuario(grupo, cpf):
        user = Usuario.objects.create(
            email=f"{cpf}@teste.local", username=cpf, nome_completo=f"Profissional {grupo}",
            cpf=cpf, telefone="85999999999", password="!",
        )
        user.groups.add(Group.objects.get_or_create(name=grupo)[0])
        user.user_permissions.add(Permission.objects.get(content_type__app_label="agendamentos", codename="view_agendamento"))
        return user

    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(self.supervisor)
        self.params = {"unidade_id": str(self.unidade.id), "data_inicio": str(DIA), "data_fim": str(DIA)}

    def atendimento(self, **kwargs):
        # As regras de ocupação não são parte da medição; os registros preservam suas vagas em testes de transição.
        valores = dict(cidadao=self.cidadao, unidade=self.unidade, servico=self.servico, atendente=self.medico,
                       data=DIA, horario=time(9), situacao="FINALIZADO",
                       data_hora_inicio_atendimento=time(9), data_hora_fim_atendimento=time(9, 20))
        return Agendamento.objects.bulk_create([Agendamento(**{**valores, **kwargs})])[0]

    def resumo(self):
        response = self.client.get(URL_RESUMO, self.params)
        self.assertEqual(response.status_code, 200, response.content)
        return response.json()["results"]["sla"]

    def test_media_ponderada_por_consulta_e_agrupamentos(self):
        self.atendimento(data_hora_fim_atendimento=time(9, 10))
        self.atendimento()
        self.atendimento(servico=self.outro_servico, data_hora_fim_atendimento=time(10), atendente=self.enfermeiro)
        # Dois grupos não podem duplicar as consultas do médico.
        self.medico.groups.add(Group.objects.get(name="Enfermeiro"))
        dados = self.resumo()
        self.assertEqual(dados["media_min"], 30)
        self.assertEqual(dados["total_medidos"], 3)
        self.assertEqual(dados["por_medico"][0]["media_min"], 15)
        self.assertEqual(dados["por_medico"][0]["medidos"], 2)
        self.assertEqual(len(dados["por_medico"]), 1)
        por_servico = {r["id"]: r for r in dados["por_servico"]}
        self.assertEqual(por_servico[str(self.servico.id)]["meta_min"], 20)
        self.assertEqual(por_servico[str(self.outro_servico.id)]["media_min"], 60)

    def test_ausencia_de_medicao_nao_vira_zero_na_media(self):
        self.atendimento(data_hora_inicio_atendimento=None)
        self.atendimento(data_hora_fim_atendimento=time(8))
        self.atendimento(situacao="ATENDIMENTO", data_hora_fim_atendimento=None)
        dados = self.resumo()
        self.assertIsNone(dados["media_min"])
        self.assertEqual(dados["total_encerrados"], 2)
        self.assertEqual(dados["sem_medicao"], 2)
        self.assertEqual(dados["total_medidos"], 0)

    def test_zero_e_uma_medicao_valida(self):
        self.atendimento(data_hora_fim_atendimento=time(9))
        dados = self.resumo()
        self.assertEqual(dados["media_min"], 0)
        self.assertEqual(dados["total_medidos"], 1)

    def test_datas_completas_medem_a_virada_do_dia(self):
        inicio = timezone.make_aware(datetime.combine(DIA, time(23, 50)))
        agendamento = self.atendimento(
            inicio_atendimento_em=inicio, fim_atendimento_em=inicio + timedelta(minutes=30),
            data_hora_inicio_atendimento=time(23, 50), data_hora_fim_atendimento=time(0, 20),
        )
        self.assertEqual(self.resumo()["media_min"], 30)
        detalhe = self.client.get(URL_LISTA, self.params).json()["results"][0]
        self.assertEqual(detalhe["id"], str(agendamento.id))
        self.assertEqual(detalhe["medicao"]["duracao_min"], 30)
        self.assertFalse(detalhe["medicao"]["historico"])
        self.assertFalse(detalhe["medicao"]["dentro_meta"])

    def test_data_completa_invalida_nao_recai_no_horario_legado(self):
        inicio = timezone.make_aware(datetime.combine(DIA, time(9)))
        self.atendimento(inicio_atendimento_em=inicio, fim_atendimento_em=inicio - timedelta(minutes=1))
        self.assertIsNone(self.resumo()["media_min"])
        detalhe = self.client.get(URL_LISTA, self.params).json()["results"][0]
        self.assertIn("anterior", detalhe["medicao"]["motivo"])
        self.assertIsNone(detalhe["medicao"]["duracao_min"])

    def test_consulta_encerrada_na_farmacia_entra_na_media(self):
        self.atendimento(situacao="AGUARDANDO_RETIRADA")
        self.atendimento(situacao="CHAMANDO_RETIRADA", data_hora_fim_atendimento=time(9, 40))
        self.assertEqual(self.resumo()["media_min"], 30)

    def test_filtros_de_unidade_e_periodo_isolam_a_media(self):
        self.atendimento()
        self.atendimento(unidade=self.outra_unidade, data_hora_fim_atendimento=time(10))
        self.atendimento(data=DIA - timedelta(days=1), data_hora_fim_atendimento=time(10))
        self.assertEqual(self.resumo()["total_medidos"], 1)
        self.assertEqual(self.resumo()["media_min"], 20)

    def test_unidade_nao_autorizada_bloqueia_resumo_e_detalhes(self):
        params = {**self.params, "unidade_id": str(self.outra_unidade.id)}
        for url in [URL_RESUMO, URL_LISTA]:
            with self.subTest(url=url):
                self.assertEqual(self.client.get(url, params).status_code, 403)

    def test_medico_nao_acessa_indicadores_do_supervisor(self):
        self.medico.unidades_lotacao.add(self.unidade)
        self.client.force_authenticate(self.medico)
        for url in [URL_RESUMO, URL_LISTA]:
            self.assertEqual(self.client.get(url, self.params).status_code, 403)

    def test_coordenador_da_unidade_acessa_detalhes(self):
        self.client.force_authenticate(self.coordenador)
        self.assertEqual(self.client.get(URL_LISTA, self.params).status_code, 200)

    def test_anonimo_nao_acessa(self):
        self.client.force_authenticate(None)
        for url in [URL_RESUMO, URL_LISTA]:
            self.assertIn(self.client.get(url, self.params).status_code, (401, 403))

    def test_periodo_invertido_e_unidade_invalida_sao_rejeitados(self):
        for params in [{**self.params, "unidade_id": "invalido"}, {**self.params, "data_fim": "2026-10-27"}]:
            for url in [URL_RESUMO, URL_LISTA]:
                self.assertEqual(self.client.get(url, params).status_code, 400)

    def test_listagem_tem_paginacao_filtros_e_identificador_real(self):
        primeiro = self.atendimento()
        self.atendimento(servico=self.outro_servico, atendente=self.enfermeiro)
        response = self.client.get(URL_LISTA, {**self.params, "limit": 1})
        self.assertEqual(response.status_code, 200, response.content)
        self.assertEqual(response.json()["count"], 2)
        self.assertIsNotNone(response.json()["next"])
        response = self.client.get(URL_LISTA, {**self.params, "profissional_id": str(self.medico.id), "servico_id": str(self.servico.id)})
        dados = response.json()
        self.assertEqual(dados["count"], 1)
        self.assertEqual(dados["results"][0]["identificador"], str(primeiro.id).split("-")[0].upper())
        self.assertTrue(dados["results"][0]["medicao"]["historico"])
        self.assertEqual(self.client.get(URL_LISTA, {**self.params, "busca": "Maria"}).json()["count"], 2)
        self.assertEqual(self.client.get(URL_LISTA, {**self.params, "busca": str(primeiro.id)[:8]}).json()["count"], 1)
        self.assertEqual(self.client.get(URL_LISTA, {**self.params, "servico_id": "invalido"}).status_code, 400)

    def test_agregacao_nao_faz_uma_consulta_por_medico_ou_servico(self):
        for _ in range(12):
            self.atendimento()
        with self.assertNumQueries(3):
            resultado = resumo_sla(Agendamento.objects.filter(unidade=self.unidade))
        self.assertEqual(resultado["total_medidos"], 12)

    def test_servidor_registra_marcos_e_nao_sobrescreve_em_repeticoes(self):
        vaga = AgendaVaga.objects.create(unidade=self.unidade, tipo_servico=self.servico.tipo_servico,
                                        data=DIA, horario=time(9), vagas=10, vagas_ocupadas=1)
        atendimento = self.atendimento(situacao="CHAMANDO", vaga=vaga,
                                       data_hora_inicio_atendimento=None, data_hora_fim_atendimento=None)
        inicio = timezone.make_aware(datetime.combine(DIA, time(23, 55)))
        fim = inicio + timedelta(minutes=10)
        for situacao, agora in [("ATENDIMENTO", inicio), ("ATENDIMENTO", inicio + timedelta(minutes=1)),
                                ("FINALIZADO", fim), ("FINALIZADO", fim + timedelta(hours=1))]:
            with patch("agendamentos.serializers.timezone.now", return_value=agora):
                serializer = AgendamentoSerializer(atendimento, data={"situacao": situacao,
                    "data_hora_inicio_atendimento": "01:00:00", "data_hora_fim_atendimento": "02:00:00"}, partial=True)
                self.assertTrue(serializer.is_valid(), serializer.errors)
                serializer.save()
        atendimento.refresh_from_db()
        self.assertEqual(atendimento.inicio_atendimento_em, inicio)
        self.assertEqual(atendimento.fim_atendimento_em, fim)
        self.assertEqual(resumo_sla(Agendamento.objects.all())["media_min"], 10)

    def test_encaminhamento_a_farmacia_registra_fim_da_consulta(self):
        inicio = timezone.make_aware(datetime.combine(DIA, time(9)))
        atendimento = self.atendimento(situacao="ATENDIMENTO", inicio_atendimento_em=inicio,
                                       data_hora_fim_atendimento=None)
        fim = inicio + timedelta(minutes=12)
        with patch("prontuario.serializers.timezone.now", return_value=fim):
            ReceitaSerializer._encaminhar_para_retirada(atendimento)
        atendimento.refresh_from_db()
        self.assertEqual(atendimento.fim_atendimento_em, fim)
        self.assertEqual(resumo_sla(Agendamento.objects.all())["media_min"], 12)
