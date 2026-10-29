from datetime import datetime, time, timedelta

from django.contrib.auth.models import Permission
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import Agendamento
from cidadaos.models import Cidadao
from medicamentos.tests_estoque import criar_unidade
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import UnidadePosto
from . import indicadores
from .tests import DIA
from . import tests as sla_tests


URL_SUPERVISOR = "/api/v1/dashboard-supervisor/"
URL_MONITOR = "/api/v1/dashboard-monitor-unidade/"
URL_GESTOR = "/api/v1/dashboard-gestor/"
URL_MAPA = "/api/v1/mapa_unidades/"
URL_SERIE = "/api/v1/mapa/unidades/series/"


class IndicadoresConsistentesTests(TestCase):
    """O mesmo indicador, na mesma unidade e período, precisa ter o mesmo valor em todas as telas."""

    @classmethod
    def setUpTestData(cls):
        cls.unidade = criar_unidade("Posto Norte")
        UnidadePosto.objects.filter(pk=cls.unidade.pk).update(created_at=timezone.now() - timedelta(days=365))
        cls.supervisor = sla_tests.SupervisorSlaTests.usuario("Supervisor", "52998224725")
        cls.gestor = sla_tests.SupervisorSlaTests.usuario("gestor", "86288366757")
        cls.medico = sla_tests.SupervisorSlaTests.usuario("Médico", "11144477735")
        cls.supervisor.unidades_lotacao.add(cls.unidade)
        view_unidade = Permission.objects.get(content_type__app_label="unidade_posto", codename="view_unidadeposto")
        cls.gestor.user_permissions.add(view_unidade)
        cls.cidadao = Cidadao.objects.create(nome="Paciente", cpf="15350946056")
        cls.servico = Servico.objects.create(
            nome="Consulta clínica", classe=ClasseServico.objects.create(nome="Atenção Básica"),
            tipo_servico=TipoServico.objects.create(nome="Consulta médica", tempo_atendimento=20),
        )

    def setUp(self):
        self.client = APIClient()
        self.periodo = {"data_inicio": str(DIA), "data_fim": str(DIA)}

    def agendamento(self, situacao, inicio=None, fim=None, unidade=None, horario=time(9)):
        return Agendamento.objects.bulk_create([Agendamento(
            cidadao=self.cidadao, unidade=unidade or self.unidade, servico=self.servico, atendente=self.medico,
            data=DIA, horario=horario, situacao=situacao,
            data_hora_inicio_atendimento=inicio, data_hora_fim_atendimento=fim,
        )])[0]

    def cenario(self):
        self.agendamento("FINALIZADO", time(9), time(9, 20))
        # Consulta encerrada e encaminhada à farmácia: conta como realizada.
        self.agendamento("AGUARDANDO_RETIRADA", time(9), time(9, 40))
        self.agendamento("AUSENCIA_CIDADAO")
        self.agendamento("ATIVADO_AUSENTE")
        self.agendamento("ATIVADO")
        self.agendamento("CHAMANDO")
        # Ainda não chegou a hora e foi cancelado: ficam fora do absenteísmo.
        self.agendamento("AGENDADO")
        self.agendamento("CANCELADO_CIDADAO")

    def resultados(self, url, usuario, params):
        self.client.force_authenticate(usuario)
        response = self.client.get(url, params)
        self.assertEqual(response.status_code, 200, response.content)
        dados = response.json()
        return dados.get("results", dados.get("result"))

    def test_mesma_unidade_tem_os_mesmos_numeros_em_todas_as_telas(self):
        self.cenario()
        params_unidade = {**self.periodo, "unidade_id": str(self.unidade.id)}
        supervisor = self.resultados(URL_SUPERVISOR, self.supervisor, params_unidade)
        monitor = self.resultados(URL_MONITOR, self.gestor, params_unidade)
        gestor = self.resultados(URL_GESTOR, self.gestor, self.periodo)
        linha_gestor = next(u for u in gestor["informacoes_unidade"] if u["unidade_id"] == str(self.unidade.id))
        mapa = next(u for u in self.resultados(URL_MAPA, self.gestor, self.periodo) if u["id"] == str(self.unidade.id))
        detalhe = self.resultados(f"{URL_MAPA}{self.unidade.id}/", self.gestor, self.periodo)
        serie = self.resultados(URL_SERIE, self.gestor, params_unidade)["serie"][0]

        # 2 ausentes sobre 6 que deveriam ter vindo (2 ausentes + 4 que chegaram).
        for nome, taxa in [("supervisor", supervisor["taxa_nao_comparecimento"]),
                           ("monitor", monitor["taxa_nao_comparecimento"]),
                           ("gestor", gestor["taxa_nao_comparecimento"]),
                           ("gestor por unidade", linha_gestor["taxa_nao_comparecimento"]),
                           ("mapa", mapa["metricas"]["taxa_absenteismo"]),
                           ("detalhe do mapa", detalhe["metricas"]["taxa_absenteismo"])]:
            with self.subTest(tela=nome):
                self.assertEqual(taxa, 33.33)

        for nome, tempo in [("supervisor", supervisor["tempo_medio"]), ("SLA", supervisor["sla"]["media_min"]),
                            ("monitor", monitor["tempo_medio"]), ("gestor", gestor["tempo_medio"]),
                            ("gestor por unidade", linha_gestor["duracao_media_atendimento_min"]),
                            ("mapa", mapa["metricas"]["tempo_medio_atendimento_min"]),
                            ("detalhe do mapa", detalhe["metricas"]["tempo_medio_atendimento_min"]),
                            ("série", serie["tempo_medio_atendimento_min"])]:
            with self.subTest(tela=nome):
                self.assertEqual(tempo, 30)

        for dados in [supervisor, monitor, gestor]:
            self.assertEqual(dados["nao_compareceu"], 2)
            self.assertEqual(dados["aguardando_atendimento_ativado"], 2)
        self.assertEqual(supervisor["em_retirada"], 1)
        self.assertEqual(mapa["metricas"]["servicos_prestados_30d"], 2)
        self.assertEqual(serie["finalizados_total"], 2)

    def test_metricas_por_servico_incluem_a_consulta_encaminhada_a_farmacia(self):
        self.cenario()
        params = {**self.periodo, "unidade_id": str(self.unidade.id)}
        for url, usuario in [(URL_SUPERVISOR, self.supervisor), (URL_MONITOR, self.gestor)]:
            with self.subTest(url=url):
                servico = self.resultados(url, usuario, params)["servicos_metricas"][0]
                self.assertEqual(servico["total"], 2)
                self.assertEqual(servico["tempo_medio_atendimento_min"], 30)
                self.assertEqual(servico["esperado_min"], 20)
                self.assertEqual(servico["pct_dentro_meta"], 50)
                # Média do que passou da meta por consulta: (0 + 20) / 2.
                self.assertEqual(servico["tempo_excedente_medio_min"], 10)

    def test_absenteismo_ignora_agendamentos_futuros_e_cancelados(self):
        self.agendamento("AGENDADO")
        self.agendamento("CANCELADO_CRAS")
        contagens = indicadores.contar(Agendamento.objects.all())
        self.assertEqual(contagens["taxa_absenteismo"], 0)
        self.assertEqual(contagens["total"], 2)

    def test_espera_conta_a_partir_do_horario_marcado_e_nao_fica_negativa(self):
        inicio = timezone.make_aware(datetime.combine(DIA, time(9, 10)))
        Agendamento.objects.filter(pk=self.agendamento("FINALIZADO", time(9, 10), time(9, 30)).pk).update(
            inicio_atendimento_em=inicio, fim_atendimento_em=inicio + timedelta(minutes=20),
        )
        # Atendido antes do horário marcado: espera zero, não negativa.
        self.agendamento("FINALIZADO", time(8, 50), time(9, 10))
        tempos = indicadores.tempos_por(Agendamento.objects.all(), "unidade_id")[self.unidade.id].resumo()
        self.assertEqual(tempos["tempo_medio_espera_min"], 5)
        self.assertEqual(tempos["tempo_medio_atendimento_min"], 20)
        self.assertEqual(tempos["pct_dentro_meta"], 100)

    def test_gestor_separa_duracao_espera_e_meta_por_unidade(self):
        self.cenario()
        linha = self.resultados(URL_GESTOR, self.gestor, self.periodo)["informacoes_unidade"][0]
        self.assertEqual(linha["duracao_media_atendimento_min"], 30)
        # As duas consultas começaram no horário marcado.
        self.assertEqual(linha["tempo_medio_espera_min"], 0)
        self.assertEqual(linha["pct_dentro_meta"], 50)

    def test_gestor_responde_erro_de_validacao_com_400(self):
        self.client.force_authenticate(self.gestor)
        response = self.client.get(URL_GESTOR, {"data_inicio": "data-invalida", "data_fim": str(DIA)})
        self.assertEqual(response.status_code, 400)
        self.assertNotIn("detail", response.json().get("results", {}))

    def test_mapa_nao_mostra_a_origem_156(self):
        Agendamento.objects.filter(pk=self.agendamento("FINALIZADO", time(9), time(9, 20)).pk).update(origem="156")
        mapa = next(u for u in self.resultados(URL_MAPA, self.gestor, self.periodo) if u["id"] == str(self.unidade.id))
        self.assertEqual(mapa["metricas"]["origem_atendimentos"], {"RECEPCAO": 0, "SITE": 0, "FILA": 0})
        self.assertEqual(mapa["metricas"]["atendimentos_total"], 1)

    def test_mapa_e_dashboards_consultam_tempos_sem_uma_consulta_por_servico(self):
        for _ in range(10):
            self.agendamento("FINALIZADO", time(9), time(9, 20))
        with self.assertNumQueries(3):
            indicadores.metricas_mapa_por_unidade([self.unidade.id], DIA, DIA)


class AcessoIndicadoresDaRedeTests(TestCase):
    """Indicadores de todas as unidades são só do gestor e do administrador."""

    @classmethod
    def setUpTestData(cls):
        cls.unidade = criar_unidade("Posto Leste")
        UnidadePosto.objects.filter(pk=cls.unidade.pk).update(created_at=timezone.now() - timedelta(days=365))
        view_unidade = Permission.objects.get(content_type__app_label="unidade_posto", codename="view_unidadeposto")
        cls.usuarios = {}
        for grupo, cpf in [("gestor", "52998224725"), ("administrador", "86288366757"), ("Supervisor", "11144477735"),
                           ("Médico", "39053344705"), ("Recepcionista", "15350946056"), ("Farmacêutico", "71428793860")]:
            usuario = sla_tests.SupervisorSlaTests.usuario(grupo, cpf)
            # Todos têm as permissões de leitura dos modelos: o que separa os perfis é o grupo.
            usuario.user_permissions.add(view_unidade)
            usuario.unidades_lotacao.add(cls.unidade)
            cls.usuarios[grupo] = usuario

    def rotas(self):
        periodo = {"data_inicio": str(DIA), "data_fim": str(DIA)}
        com_unidade = {**periodo, "unidade_id": str(self.unidade.id)}
        return [(URL_GESTOR, periodo), (URL_MONITOR, com_unidade), (URL_SERIE, com_unidade),
                ("/api/v1/mapa/unidades/", periodo), ("/api/v1/mapa/medicamentos/", periodo)]

    def test_gestor_e_administrador_acessam(self):
        client = APIClient()
        for grupo in ["gestor", "administrador"]:
            client.force_authenticate(self.usuarios[grupo])
            for url, params in self.rotas():
                with self.subTest(grupo=grupo, url=url):
                    self.assertEqual(client.get(url, params).status_code, 200)

    def test_demais_perfis_sao_bloqueados_mesmo_com_permissao_de_leitura(self):
        client = APIClient()
        for grupo in ["Supervisor", "Médico", "Recepcionista", "Farmacêutico"]:
            client.force_authenticate(self.usuarios[grupo])
            for url, params in self.rotas():
                with self.subTest(grupo=grupo, url=url):
                    self.assertEqual(client.get(url, params).status_code, 403)

    def test_anonimo_nao_acessa(self):
        client = APIClient()
        for url, params in self.rotas():
            with self.subTest(url=url):
                self.assertIn(client.get(url, params).status_code, (401, 403))

    def test_cache_do_navegador_separa_usuarios(self):
        client = APIClient()
        client.force_authenticate(self.usuarios["gestor"])
        for url, params in self.rotas()[2:4]:
            with self.subTest(url=url):
                response = client.get(url, params)
                self.assertIn("Authorization", response["Vary"])
                # A segunda chamada vem do cache do servidor e precisa manter o cabeçalho.
                self.assertIn("Authorization", client.get(url, params)["Vary"])
