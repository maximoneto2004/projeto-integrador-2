from io import StringIO

from django.conf import settings
from django.contrib.auth.models import Group
from django.core.management import call_command
from django.test import TestCase
from rest_framework.test import APIClient

from medicamentos.tests import criar_usuario
from medicamentos.tests_estoque import criar_unidade
from servicos import catalogo_saude as catalogo
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import ServicoUnidadePosto


def carregar(*flags):
    call_command("carregar_catalogo_saude", *flags, stdout=StringIO())


class CatalogoSaudeCommandTests(TestCase):
    def setUp(self):
        self.tipo_antigo = TipoServico.objects.create(nome="COMUM")
        self.classe_antiga = ClasseServico.objects.create(nome="Cadastro Único")
        self.servico_antigo = Servico.objects.create(
            nome="Atualização Cadastral", classe=self.classe_antiga, tipo_servico=self.tipo_antigo
        )

    def test_carrega_catalogo_e_inativa_itens_antigos(self):
        carregar()

        self.assertEqual(ClasseServico.objects.filter(is_active=True).count(), len(catalogo.CLASSES))
        self.assertEqual(TipoServico.objects.filter(is_active=True).count(), len(catalogo.TIPOS))
        self.assertEqual(Servico.objects.filter(is_active=True).count(), len(catalogo.SERVICOS))
        for obj in (self.tipo_antigo, self.classe_antiga, self.servico_antigo):
            obj.refresh_from_db()
            self.assertFalse(obj.is_active)

        consulta = Servico.objects.get(nome="Consulta Clínica Geral")
        self.assertEqual(consulta.id, catalogo.gerar_id("servico", "Consulta Clínica Geral"))
        self.assertTrue(consulta.gera_receita)
        self.assertEqual(consulta.tipo_servico.nome, catalogo.CONSULTA_MEDICA)
        self.assertTrue(Servico.objects.get(nome="Dispensação de Medicamentos com Receita").envolve_dispensacao)

    def test_idempotente(self):
        carregar()
        carregar()
        self.assertEqual(Servico.objects.count(), len(catalogo.SERVICOS) + 1)

    def test_manter_antigos(self):
        carregar("--manter-antigos")
        self.servico_antigo.refresh_from_db()
        self.assertTrue(self.servico_antigo.is_active)

    def test_reaproveita_registro_com_mesmo_nome(self):
        existente = Servico.objects.create(
            nome="Curativo", classe=self.classe_antiga, tipo_servico=self.tipo_antigo, is_active=False
        )
        carregar()
        existente.refresh_from_db()
        self.assertTrue(existente.is_active)
        self.assertEqual(existente.tipo_servico.nome, catalogo.PROCEDIMENTO_ENFERMAGEM)
        self.assertEqual(Servico.objects.filter(nome="Curativo").count(), 1)

    def test_vincula_unidades_e_atribui_tipos(self):
        unidade = criar_unidade("Posto A")
        ServicoUnidadePosto.objects.create(
            unidade=unidade, servico=self.servico_antigo, dias_semana=["SEG"], mesmo_expediente=True
        )
        medico = criar_usuario("medico@teste.local", "11144477735", "Médico")
        enfermeiro_supervisor = criar_usuario("enf@teste.local", "39053344705", "Enfermeiro")
        enfermeiro_supervisor.groups.add(Group.objects.get(name="Supervisor"))
        medico.tipo_ofertados.add(self.tipo_antigo)

        carregar("--vincular-unidades", "--atribuir-tipos")

        ofertas = ServicoUnidadePosto.objects.filter(unidade=unidade, is_active=True)
        self.assertEqual(ofertas.count(), len(catalogo.SERVICOS))
        self.assertFalse(ServicoUnidadePosto.objects.get(servico=self.servico_antigo).is_active)
        self.assertEqual(set(ofertas.first().dias_semana), {"SEG", "TER", "QUA", "QUI", "SEX"})

        self.assertEqual({t.nome for t in medico.tipo_ofertados.all()}, {catalogo.CONSULTA_MEDICA})
        self.assertEqual(
            {t.nome for t in enfermeiro_supervisor.tipo_ofertados.all()},
            {catalogo.CONSULTA_ENFERMAGEM, catalogo.PROCEDIMENTO_ENFERMAGEM, catalogo.DISPENSACAO},
        )

        carregar("--vincular-unidades")
        self.assertEqual(ServicoUnidadePosto.objects.filter(unidade=unidade, is_active=True).count(), len(catalogo.SERVICOS))


class SelecaoParaAgendamentoTests(TestCase):
    def setUp(self):
        carregar()
        self.unidade = criar_unidade("Posto A")
        self.client = APIClient()
        for nome in ("Consulta Clínica Geral", "Aferição de Pressão Arterial", "Nebulização"):
            ServicoUnidadePosto.objects.create(
                unidade=self.unidade, servico=Servico.objects.get(nome=nome), dias_semana=["SEG"], mesmo_expediente=True
            )

    def test_lista_so_tipos_e_servicos_agendaveis(self):
        tipos = self.client.get(f"/api/v1/ajax/tipos/{self.unidade.id}/").json()["tipos"]
        self.assertEqual([t["nome"] for t in tipos], [catalogo.CONSULTA_MEDICA])

        tipo_procedimento = TipoServico.objects.get(nome=catalogo.PROCEDIMENTO_ENFERMAGEM)
        servicos = self.client.get(f"/api/v1/ajax/servicos/{self.unidade.id}/{tipo_procedimento.id}/").json()["servicos"]
        self.assertEqual(servicos, [])

    def test_ignora_servico_inativo(self):
        Servico.objects.filter(nome="Consulta Clínica Geral").update(is_active=False)
        self.assertEqual(self.client.get(f"/api/v1/ajax/tipos/{self.unidade.id}/").json()["tipos"], [])


class FixturesTests(TestCase):
    def test_fixtures_da_collection_batem_com_o_catalogo(self):
        for arquivo in ("classe_servico.json", "tipos_servico.json", "servicos.json"):
            call_command("loaddata", str(settings.BASE_DIR / "Collection" / arquivo), verbosity=0)

        esperado = {catalogo.gerar_id("servico", nome) for nome, *_ in catalogo.SERVICOS}
        self.assertEqual(set(Servico.objects.values_list("id", flat=True)), esperado)
        carregar()
        self.assertEqual(Servico.objects.count(), len(catalogo.SERVICOS))


class ServicoApiTests(TestCase):
    def test_detalhe_expoe_flags(self):
        carregar()
        resp = APIClient().get("/api/v1/servico/", {"nome": "Consulta Clínica Geral"})
        servico = resp.json()["result"][0]
        self.assertEqual((servico["gera_receita"], servico["envolve_dispensacao"]), (True, False))
