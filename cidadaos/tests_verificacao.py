import re
from datetime import timedelta
from unittest.mock import patch

from django.core import mail
from django.core.cache import cache
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken

from cidadaos.models import Cidadao, VerificacaoCidadao
from cidadaos.verificacao import CODIGO_INVALIDO, _enviar_codigo
from medicamentos.tests import criar_usuario

URL_INICIAR = "/api/v1/cidadaos/verificacao/"
URL_CONFIRMAR = "/api/v1/cidadaos/verificacao/confirmar/"
URL_MEUS_DADOS = "/api/v1/cidadaos/eu/"


@override_settings(
    CIDADAO_CODIGO_VALIDADE_MINUTOS=10,
    CIDADAO_CODIGO_MAX_TENTATIVAS=3,
    CIDADAO_CODIGO_ENVIOS_POR_MINUTO=100,
    CIDADAO_CODIGO_ENVIOS_POR_HORA=100,
)
class VerificacaoCidadaoTest(TestCase):
    def setUp(self):
        cache.clear()
        # Envia na mesma thread para o e-mail já estar em mail.outbox ao fim da requisição.
        envio = patch("cidadaos.verificacao._enviar_em_segundo_plano", side_effect=_enviar_codigo)
        envio.start()
        self.addCleanup(envio.stop)
        self.client = APIClient()
        self.cidadao = Cidadao.objects.create(nome="Maria Silva", cpf="15350946056", email="maria@exemplo.com")

    def _iniciar(self, cpf="153.509.460-56"):
        return self.client.post(URL_INICIAR, {"cpf": cpf}, format="json")

    def _codigo_enviado(self):
        return re.search(r"\b(\d{6})\b", mail.outbox[-1].body).group(1)

    def _confirmar(self, verificacao_id, codigo):
        return self.client.post(URL_CONFIRMAR, {"verificacao_id": verificacao_id, "codigo": codigo}, format="json")

    def _token_cidadao(self):
        verificacao_id = self._iniciar().data["result"]["verificacao_id"]
        return self._confirmar(verificacao_id, self._codigo_enviado()).data["result"]["access"]

    def test_rotas_publicas_ignoram_token_invalido(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer token-qualquer")
        self.assertEqual(self._iniciar().status_code, 202)

    def test_envia_codigo_para_email_cadastrado(self):
        resp = self._iniciar()
        self.assertEqual(resp.status_code, 202)
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(mail.outbox[0].to, ["maria@exemplo.com"])
        verificacao = VerificacaoCidadao.objects.get()
        self.assertEqual(resp.data["result"]["verificacao_id"], str(verificacao.id))
        self.assertNotIn(self._codigo_enviado(), verificacao.codigo_hash)

    def test_cpf_sem_cadastro_tem_a_mesma_resposta(self):
        Cidadao.objects.create(nome="Joao Sem Email", cpf="52998224725")
        existente = self._iniciar()
        for cpf in ("111.444.777-35", "529.982.247-25"):
            resp = self._iniciar(cpf)
            self.assertEqual(resp.status_code, existente.status_code)
            self.assertEqual(resp.data["result"].keys(), existente.data["result"].keys())
            self.assertEqual(resp.data["result"]["mensagem"], existente.data["result"]["mensagem"])
            erro = self._confirmar(resp.data["result"]["verificacao_id"], "123456")
            self.assertEqual(erro.status_code, 400)
            self.assertEqual(erro.data["codigo"], CODIGO_INVALIDO)
        self.assertEqual(len(mail.outbox), 1)

    def test_confirma_codigo_correto_e_devolve_token(self):
        verificacao_id = self._iniciar().data["result"]["verificacao_id"]
        resp = self._confirmar(verificacao_id, self._codigo_enviado())
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["result"]["cidadao"]["id"], str(self.cidadao.id))
        self.assertTrue(resp.data["result"]["access"])
        # O mesmo código não pode ser usado duas vezes.
        self.assertEqual(self._confirmar(verificacao_id, self._codigo_enviado()).status_code, 400)

    def test_codigo_incorreto_conta_tentativas_ate_bloquear(self):
        verificacao_id = self._iniciar().data["result"]["verificacao_id"]
        codigo = self._codigo_enviado()
        errado = "000000" if codigo != "000000" else "111111"
        resp = self._confirmar(verificacao_id, errado)
        self.assertEqual(resp.status_code, 400)
        self.assertEqual(resp.data["codigo"], CODIGO_INVALIDO)
        self._confirmar(verificacao_id, errado)
        self._confirmar(verificacao_id, errado)
        self.assertEqual(VerificacaoCidadao.objects.get().tentativas, 3)
        # Bloqueado: nem o código certo vale mais.
        self.assertEqual(self._confirmar(verificacao_id, codigo).status_code, 400)

    def test_codigo_expirado(self):
        verificacao_id = self._iniciar().data["result"]["verificacao_id"]
        VerificacaoCidadao.objects.update(expira_em=timezone.now() - timedelta(seconds=1))
        self.assertEqual(self._confirmar(verificacao_id, self._codigo_enviado()).status_code, 400)

    def test_novo_pedido_invalida_codigo_anterior(self):
        primeiro_id = self._iniciar().data["result"]["verificacao_id"]
        primeiro_codigo = self._codigo_enviado()
        self._iniciar()
        self.assertEqual(self._confirmar(primeiro_id, primeiro_codigo).status_code, 400)

    def test_falha_no_envio_nao_altera_a_resposta(self):
        with patch("cidadaos.verificacao.send_mail", side_effect=OSError("SMTP indisponível")):
            with self.assertLogs("cidadaos.verificacao", level="ERROR"):
                resp = self._iniciar()
        self.assertEqual(resp.status_code, 202)

    @override_settings(CIDADAO_CODIGO_ENVIOS_POR_MINUTO=1)
    def test_limite_por_cpf_vale_com_ou_sem_cadastro(self):
        for cpf in ("153.509.460-56", "111.444.777-35"):
            self.assertEqual(self._iniciar(cpf).status_code, 202)
            self.assertEqual(self._iniciar(cpf).status_code, 429)
        # O limite é por CPF: outro CPF continua liberado.
        self.assertEqual(self._iniciar("529.982.247-25").status_code, 202)
        self.assertEqual(len(mail.outbox), 1)

    def test_token_do_cidadao_acessa_seus_dados(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token_cidadao()}")
        resp = self.client.get(URL_MEUS_DADOS)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["result"]["id"], str(self.cidadao.id))

    def test_token_do_cidadao_nao_acessa_rotas_de_funcionario(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token_cidadao()}")
        self.assertEqual(self.client.get("/api/v1/cidadaos/").status_code, 401)

    def test_token_de_funcionario_nao_acessa_rotas_do_cidadao(self):
        usuario = criar_usuario("integracao@teste.com", "52998224725")
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {RefreshToken.for_user(usuario).access_token}")
        self.assertEqual(self.client.get(URL_MEUS_DADOS).status_code, 401)

    def test_token_de_cidadao_inativo_e_recusado(self):
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {self._token_cidadao()}")
        Cidadao.objects.filter(pk=self.cidadao.pk).update(is_active=False)
        self.assertEqual(self.client.get(URL_MEUS_DADOS).status_code, 401)
