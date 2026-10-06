import secrets
from datetime import time, timedelta

from django.conf import settings
from django.contrib.auth.hashers import make_password
from django.core.management import call_command
from io import StringIO
from django.test import TestCase, override_settings
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import Agendamento, AgendaVaga
from app.models import Bairro
from cidadaos.models import Cidadao
from integracao.models import DesafioAutenticacaoCidadao, SessaoCidadao, hash_token
from medicamentos.models import LoteMedicamento, Medicamento
from prontuario.models import Receita, ReceitaMedicamento
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import UnidadePosto


@override_settings(CITIZEN_AUTH_MOCK_ENABLED=True, CITIZEN_AUTH_MOCK_CODE="123456", CITIZEN_AUTH_MAX_ATTEMPTS=3, INTEGRATION_LOGIN_API_KEY="integration-test-key")
class IntegracaoTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.credentials(HTTP_X_INTEGRATION_KEY="integration-test-key")
        bairro = Bairro.objects.create(nome="Bairro Teste")
        self.unidade = UnidadePosto.objects.create(nome="Posto Teste", logradouro="Rua A", numero="1", cep="60000-000", bairro=bairro, telefone="85999999999", email="posto@example.test", hora_manha_inicio=time(8), hora_manha_fim=time(12))
        classe = ClasseServico.objects.create(nome="Classe Teste")
        self.tipo = TipoServico.objects.create(nome="Tipo Teste")
        self.servico = Servico.objects.create(nome="Serviço Teste", classe=classe, tipo_servico=self.tipo, gera_receita=True)
        self.cidadao_a = Cidadao.objects.create(nome="Pessoa A", cpf="52998224725", telefone="85999990001", unidade_origem=self.unidade)
        self.cidadao_b = Cidadao.objects.create(nome="Pessoa B", cpf="11144477735", telefone="85999990002", unidade_origem=self.unidade)

    def criar_sessao(self, cidadao=None, telefone="+5585999990001", **overrides):
        token = secrets.token_urlsafe(24)
        defaults = {"cidadao": cidadao or self.cidadao_a, "telefone": telefone, "token_hash": hash_token(token), "authenticated_at": timezone.now(), "expires_at": timezone.now() + timedelta(hours=24)}
        defaults.update(overrides)
        return SessaoCidadao.objects.create(**defaults), token

    def autenticar(self, cidadao=None):
        sessao, token = self.criar_sessao(cidadao)
        self.client.credentials(HTTP_X_CITIZEN_SESSION=token, HTTP_X_INTEGRATION_KEY="integration-test-key")
        return sessao

    def test_login_agent_exige_credencial_dedicada(self):
        self.client.credentials()
        response = self.client.get(reverse("integracao-sessao"), {"telefone": "85999990001"})
        self.assertEqual(response.status_code, 403)

    @override_settings(INTEGRATION_LOGIN_API_KEY="")
    def test_login_agent_falha_fechado_sem_chave_configurada(self):
        self.client.credentials(HTTP_X_INTEGRATION_KEY="qualquer-chave")
        response = self.client.get(reverse("integracao-sessao"), {"telefone": "85999990001"})
        self.assertEqual(response.status_code, 403)

    def test_sessao_inexistente(self):
        response = self.client.get(reverse("integracao-sessao"), {"telefone": "85999990001"})
        self.assertEqual(response.status_code, 200); self.assertFalse(response.data["authenticated"])

    def test_sessao_ativa_normaliza_telefone_e_dura_24_horas(self):
        sessao, _ = self.criar_sessao()
        response = self.client.get(reverse("integracao-sessao"), {"telefone": "(85) 99999-0001"})
        self.assertTrue(response.data["authenticated"])
        self.assertGreater(response.data["remaining_seconds"], 23 * 3600)
        self.assertLessEqual(response.data["remaining_seconds"], 24 * 3600)

    def test_sessao_expirada_ou_revogada_nao_autentica(self):
        self.criar_sessao(expires_at=timezone.now() - timedelta(seconds=1))
        response = self.client.get(reverse("integracao-sessao"), {"telefone": "85999990001"})
        self.assertFalse(response.data["authenticated"])
        SessaoCidadao.objects.all().delete()
        self.criar_sessao(revoked_at=timezone.now())
        response = self.client.get(reverse("integracao-sessao"), {"telefone": "85999990001"})
        self.assertFalse(response.data["authenticated"])

    def test_desafio_cpf_inexistente(self):
        response = self.client.post(reverse("integracao-auth-iniciar"), {"cpf": "00000000000", "telefone": "85999990001"}, format="json")
        self.assertEqual(response.status_code, 404)

    def test_desafio_criado_sem_expor_codigo(self):
        response = self.client.post(reverse("integracao-auth-iniciar"), {"cpf": self.cidadao_a.cpf, "telefone": "85999990001"}, format="json")
        self.assertEqual(response.status_code, 201); self.assertNotIn("development_code", response.data)
        self.assertTrue(DesafioAutenticacaoCidadao.objects.filter(pk=response.data["challenge_id"]).exists())

    @override_settings(DEBUG=False, CITIZEN_AUTH_MOCK_EXPOSE_CODE=True)
    def test_debug_desabilitado_nunca_expoe_codigo_mock(self):
        response = self.client.post(
            reverse("integracao-auth-iniciar"),
            {"cpf": self.cidadao_a.cpf, "telefone": "85999990001"},
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        self.assertNotIn("development_code", response.data)

    def test_desafio_rejeita_telefone_diferente_do_cadastro(self):
        response = self.client.post(reverse("integracao-auth-iniciar"), {"cpf": self.cidadao_a.cpf, "telefone": "85999998888"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_codigo_correto_cria_sessao_e_desafio_nao_reutiliza(self):
        desafio = DesafioAutenticacaoCidadao.objects.create(cidadao=self.cidadao_a, telefone="+5585999990001", code_hash=make_password("123456"), expires_at=timezone.now()+timedelta(minutes=10))
        response = self.client.post(reverse("integracao-auth-verificar"), {"challenge_id": str(desafio.id), "code": "123456"}, format="json")
        self.assertEqual(response.status_code, 200); self.assertIn("session_token", response.data)
        response = self.client.post(reverse("integracao-auth-verificar"), {"challenge_id": str(desafio.id), "code": "123456"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_codigo_incorreto_conta_tentativas_e_bloqueia(self):
        desafio = DesafioAutenticacaoCidadao.objects.create(cidadao=self.cidadao_a, telefone="+5585999990001", code_hash=make_password("123456"), expires_at=timezone.now()+timedelta(minutes=10))
        for _ in range(3): self.client.post(reverse("integracao-auth-verificar"), {"challenge_id": str(desafio.id), "code": "000000"}, format="json")
        desafio.refresh_from_db(); self.assertEqual(desafio.attempts, 3); self.assertFalse(desafio.is_active)

    def test_desafio_expirado(self):
        desafio = DesafioAutenticacaoCidadao.objects.create(cidadao=self.cidadao_a, telefone="+5585999990001", code_hash=make_password("123456"), expires_at=timezone.now()-timedelta(seconds=1))
        response = self.client.post(reverse("integracao-auth-verificar"), {"challenge_id": str(desafio.id), "code": "123456"}, format="json")
        self.assertEqual(response.status_code, 400)

    @override_settings(CITIZEN_AUTH_MOCK_ENABLED=False)
    def test_mock_desabilitado(self):
        response = self.client.post(reverse("integracao-auth-iniciar"), {"cpf": self.cidadao_a.cpf, "telefone": "85999990001"}, format="json")
        self.assertEqual(response.status_code, 403)

    @override_settings(CITIZEN_AUTH_MOCK_CODE="")
    def test_mock_sem_codigo_configurado_falha_fechado(self):
        response = self.client.post(reverse("integracao-auth-iniciar"), {"cpf": self.cidadao_a.cpf, "telefone": "85999990001"}, format="json")
        self.assertEqual(response.status_code, 403)

    def test_criar_listar_e_cancelar_agendamento_proprio(self):
        self.autenticar()
        vaga = AgendaVaga.objects.create(unidade=self.unidade, tipo_servico=self.tipo, data=timezone.localdate()+timedelta(days=3), horario=time(9), vagas=2)
        response = self.client.post(reverse("integracao-agendamentos"), {"vaga_id": str(vaga.id), "servico_id": str(self.servico.id)}, format="json")
        self.assertEqual(response.status_code, 201)
        response = self.client.get(reverse("integracao-agendamentos")); self.assertEqual(len(response.data["results"]), 1)
        response = self.client.post(reverse("integracao-cancelar", args=[response.data["results"][0]["id"]]))
        self.assertEqual(response.status_code, 200)

    def test_cidadao_a_nao_lista_nem_cancela_agendamento_de_b(self):
        self.autenticar(self.cidadao_a)
        outro = Agendamento.objects.create(cidadao=self.cidadao_b, unidade=self.unidade, servico=self.servico, vaga=None, data=timezone.localdate()+timedelta(days=2), horario=time(10), origem="FILA")
        response = self.client.get(reverse("integracao-agendamentos")); self.assertEqual(response.data["results"], [])
        response = self.client.post(reverse("integracao-cancelar", args=[outro.id])); self.assertEqual(response.status_code, 404)

    def test_consultar_vagas(self):
        self.autenticar()
        vaga = AgendaVaga.objects.create(unidade=self.unidade, tipo_servico=self.tipo, data=timezone.localdate()+timedelta(days=3), horario=time(9), vagas=2)
        response = self.client.get(reverse("integracao-vagas"), {"unidade_id": self.unidade.id, "tipo_id": self.tipo.id})
        self.assertEqual(response.status_code, 200); self.assertEqual(response.data["results"][0]["vagas_disponiveis"], 2)

    def test_catalogos_rejeitam_parametros_ausentes_ou_invalidos_com_json_400(self):
        self.autenticar()
        casos = (
            (reverse("integracao-servicos-unidade", args=[self.unidade.id]), {}),
            (reverse("integracao-servicos-unidade", args=[self.unidade.id]), {"tipo_id": "invalido"}),
            (reverse("integracao-vagas"), {}),
            (reverse("integracao-vagas"), {"unidade_id": "invalido", "tipo_id": "invalido"}),
            (reverse("integracao-vagas"), {"unidade_id": self.unidade.id, "tipo_id": self.tipo.id, "data": "invalida"}),
        )
        for url, params in casos:
            with self.subTest(url=url, params=params):
                response = self.client.get(url, params)
                self.assertEqual(response.status_code, 400)
                self.assertEqual(response["Content-Type"], "application/json")

    def test_busca_cidadao_exige_cpf(self):
        response = self.client.get(reverse("integracao-cidadao-buscar"))
        self.assertEqual(response.status_code, 400)

    def test_unidades_fornecem_localizacao_sem_campos_administrativos(self):
        self.autenticar()
        response = self.client.get(reverse("integracao-unidades"))
        self.assertEqual(response.status_code, 200)
        unidade = response.data["results"][0]
        self.assertEqual(unidade["bairro"]["nome"], "Bairro Teste")
        self.assertEqual(unidade["logradouro"], "Rua A")
        self.assertNotIn("email", unidade)

    def test_cidadao_a_nao_le_receita_de_b_e_estoque_so_de_prescrito(self):
        self.autenticar(self.cidadao_a)
        agendamento_b = Agendamento.objects.create(cidadao=self.cidadao_b, unidade=self.unidade, servico=self.servico, vaga=None, data=timezone.localdate(), horario=time(10), origem="FILA", situacao="FINALIZADO")
        receita_b = Receita.objects.create(agendamento=agendamento_b, cidadao=self.cidadao_b)
        self.assertEqual(self.client.get(reverse("integracao-receita-detalhe", args=[receita_b.id])).status_code, 404)
        agendamento_a = Agendamento.objects.create(cidadao=self.cidadao_a, unidade=self.unidade, servico=self.servico, vaga=None, data=timezone.localdate(), horario=time(11), origem="FILA", situacao="FINALIZADO")
        receita_a = Receita.objects.create(agendamento=agendamento_a, cidadao=self.cidadao_a)
        prescrito = Medicamento.objects.create(nome="Prescrito", principio_ativo="A", forma_farmaceutica="COMPRIMIDO", concentracao="10", unidade_medida="MG", via_administracao="ORAL")
        arbitrario = Medicamento.objects.create(nome="Arbitrário", principio_ativo="B", forma_farmaceutica="COMPRIMIDO", concentracao="20", unidade_medida="MG", via_administracao="ORAL")
        ReceitaMedicamento.objects.create(receita=receita_a, medicamento=prescrito, nome="Prescrito", dosagem="10 mg", frequencia="1x", duracao="5 dias")
        for med in (prescrito, arbitrario): LoteMedicamento.objects.create(medicamento=med, unidade=self.unidade, numero_lote=str(med.id), validade=timezone.localdate()+timedelta(days=30), quantidade_inicial=5, quantidade_atual=5)
        response = self.client.get(reverse("integracao-receita-disponibilidade", args=[receita_a.id]))
        ids = [m["medicamento_id"] for m in response.data["medicamentos"]]
        self.assertEqual(ids, [str(prescrito.id)]); self.assertNotIn(str(arbitrario.id), ids)


class DadosIaDevTests(TestCase):
    def test_command_e_idempotente(self):
        call_command("popular_dados_ia_dev", stdout=StringIO())
        call_command("popular_dados_ia_dev", stdout=StringIO())
        self.assertEqual(Cidadao.objects.filter(cpf__in=["52998224725", "11144477735", "93541134780"]).count(), 3)
        self.assertEqual(UnidadePosto.objects.filter(nome="Posto Dev IA").count(), 1)
        self.assertEqual(Receita.objects.filter(observacoes="Receita de desenvolvimento da integração").count(), 1)
