import io
import json
import os
from datetime import date, timedelta

from django.contrib.auth.hashers import check_password
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db.models import Sum
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import AgendaVaga, Agendamento
from app.apps import AppConfig
from app.demo.carga import cpf_sintetico
from app.models import Bairro
from app.validators import validate_CPF
from cidadaos.models import Cidadao
from fila_espera.models import FilaEspera
from medicamentos.models import LoteMedicamento, MovimentacaoEstoque
from prontuario.models import Receita, ReceitaMedicamento
from unidade_posto.models import UnidadePosto
from usuarios.models import Usuario


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class CargaDemonstracaoTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.base = date(2026, 10, 29)
        cls.options = dict(senha="senha-demo-teste", data_base=cls.base, unidades=8,
                           cidadaos=48, agendamentos=180, fila=8, dias=90, seed=42, json=True)
        cls.saida = io.StringIO()
        call_command("carregar_demonstracao", stdout=cls.saida, **cls.options)
        cls.relatorio = json.loads(cls.saida.getvalue())

    def test_carga_persiste_os_oito_perfis_e_cenarios_essenciais(self):
        self.assertEqual(UnidadePosto.objects.count(), 8)
        self.assertEqual(Cidadao.objects.count(), 48)
        self.assertEqual(Agendamento.objects.count(), 180)
        self.assertEqual(FilaEspera.objects.count(), 8)
        self.assertEqual(len(self.relatorio["logins"]), 8)
        self.assertTrue(Receita.objects.exists())
        self.assertTrue(ReceitaMedicamento.objects.exists())
        self.assertTrue(MovimentacaoEstoque.objects.filter(tipo="SAIDA").exists())
        self.assertTrue(UnidadePosto.objects.filter(latitude=None, longitude=None).exists())

    def test_reexecucao_nao_duplica_nem_altera_historico_existente(self):
        antes = list(Receita.objects.order_by("id").values_list("id", "data_emissao", "created_at"))
        saida = io.StringIO()
        call_command("carregar_demonstracao", stdout=saida, **self.options)
        resultado = json.loads(saida.getvalue())
        self.assertEqual(sum(resultado["novos"].values()), 0)
        self.assertEqual(Agendamento.objects.count(), 180)
        self.assertEqual(antes, list(Receita.objects.order_by("id").values_list("id", "data_emissao", "created_at")))

    def test_quantidades_do_estoque_conferem_com_as_movimentacoes(self):
        for lote in LoteMedicamento.objects.prefetch_related("movimentacoes"):
            acumulado = 0
            for mov in lote.movimentacoes.order_by("data", "id"):
                acumulado += mov.quantidade
                self.assertEqual(mov.saldo_apos, acumulado)
            self.assertEqual(lote.quantidade_atual, acumulado)
            self.assertGreaterEqual(lote.quantidade_atual, 0)
        for item in ReceitaMedicamento.objects.all():
            saidas = item.dispensacoes.aggregate(total=Sum("quantidade"))["total"] or 0
            self.assertEqual(item.quantidade_dispensada, -saidas)
            self.assertLessEqual(item.quantidade_dispensada, item.quantidade_prescrita)

    def test_vagas_coincidem_com_agendamentos_vinculados(self):
        for vaga in AgendaVaga.objects.all():
            self.assertEqual(vaga.vagas_ocupadas, vaga.agendamentos.count())
            self.assertLessEqual(vaga.vagas_ocupadas, vaga.vagas)

    def test_datas_historicas_e_casos_de_sla_estao_preservados(self):
        receitas = list(Receita.objects.all())
        self.assertTrue(any(timezone.localtime(r.data_emissao).date() < self.base - timedelta(days=30) for r in receitas))
        for receita in receitas:
            self.assertEqual(receita.data_validade, timezone.localtime(receita.data_emissao).date() + timedelta(days=30))
        self.assertTrue(Agendamento.objects.filter(inicio_atendimento_em=None, situacao="FINALIZADO").exists())
        medidos = list(Agendamento.objects.exclude(inicio_atendimento_em=None).exclude(fim_atendimento_em=None))
        self.assertTrue(any(a.inicio_atendimento_em == a.fim_atendimento_em for a in medidos))
        self.assertTrue(any(timezone.localtime(a.fim_atendimento_em).date() > timezone.localtime(a.inicio_atendimento_em).date() for a in medidos))
        self.assertTrue(all(a.fim_atendimento_em >= a.inicio_atendimento_em for a in medidos))

    def test_logins_tem_senha_hash_e_escala_ativa(self):
        client = APIClient()
        for perfil, email in self.relatorio["logins"].items():
            user = Usuario.objects.get(email=email)
            self.assertTrue(check_password("senha-demo-teste", user.password))
            self.assertNotEqual(user.password, "senha-demo-teste")
            response = client.post("/api/v1/authentication/token/", {"email": email, "password": "senha-demo-teste"}, format="json")
            self.assertEqual(response.status_code, 200, (perfil, response.content))
        self.assertNotIn("senha-demo-teste", self.saida.getvalue())

    def test_dados_aparecem_nas_apis_integradas(self):
        client = APIClient()
        client.force_authenticate(Usuario.objects.get(email=self.relatorio["logins"]["gestor"]))
        params = {"data_inicio": str(self.base - timedelta(days=90)), "data_fim": str(self.base)}
        mapa = client.get("/api/v1/mapa_unidades/", params)
        self.assertEqual(mapa.status_code, 200, mapa.content)
        self.assertEqual(len(mapa.json()["result"]), 8)
        calor = client.get("/api/v1/mapa/medicamentos/", params)
        self.assertEqual(calor.status_code, 200, calor.content)
        self.assertGreater(calor.json()["results"]["total_solicitacoes"], 0)
        client.force_authenticate(Usuario.objects.get(email=self.relatorio["logins"]["supervisor"]))
        params["unidade_id"] = str(UnidadePosto.objects.get(nome="[DEMO] Unidade Centro").pk)
        resumo = client.get("/api/v1/dashboard-supervisor/", params)
        self.assertEqual(resumo.status_code, 200, resumo.content)
        self.assertGreater(resumo.json()["results"]["sla"]["total_medidos"], 0)

    def test_registros_alheios_sao_preservados_e_parametros_incompativeis_rejeitados(self):
        bairro = Bairro.objects.create(nome="Bairro existente")
        saida = io.StringIO()
        with self.assertRaises(CommandError):
            call_command("carregar_demonstracao", stdout=saida, **{**self.options, "agendamentos": 181})
        self.assertTrue(Bairro.objects.filter(pk=bairro.pk, nome="Bairro existente").exists())
        self.assertEqual(Agendamento.objects.count(), 180)
        with self.assertRaises(CommandError):
            call_command("carregar_demonstracao", stdout=saida, **{**self.options, "data_base": self.base - timedelta(days=1)})
        self.assertEqual(Agendamento.objects.count(), 180)

    def test_fila_nao_usa_pacientes_com_agendamentos_ativos(self):
        fila = set(FilaEspera.objects.values_list("cidadao_id", flat=True))
        ativos = set(Agendamento.ativos_queryset().values_list("cidadao_id", flat=True))
        self.assertFalse(fila & ativos)
        self.assertEqual(len(fila), 8)

    def test_validacao_de_argumentos_e_cpf(self):
        for opcoes in [{"senha": ""}, {"unidades": 0}, {"fila": 49}, {"dias": 0}]:
            with self.assertRaises(CommandError):
                call_command("carregar_demonstracao", stdout=io.StringIO(), **{**self.options, **opcoes})
        for valor in [810000000, 910000001]:
            validate_CPF(cpf_sintetico(valor))

    def test_scheduler_nao_inicia_durante_a_carga(self):
        from unittest.mock import patch
        with patch.dict(os.environ, {"DISABLE_APSCHEDULER": "0"}), patch("sys.argv", ["manage.py", "carregar_demonstracao"]):
            self.assertFalse(AppConfig._should_start_scheduler())
