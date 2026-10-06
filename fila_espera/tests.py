from unittest.mock import patch

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import Agendamento
from cidadaos.models import Cidadao
from fila_espera.models import FilaEspera
from medicamentos.tests import criar_usuario
from medicamentos.tests_estoque import criar_unidade
from servicos.models import ClasseServico, Servico, TipoServico
from usuarios.models import EscalaTrabalho


class ChamarFilaTests(TestCase):
    url = "/api/v1/fila-espera/chamar-proximo/"

    def setUp(self):
        self.client = APIClient()
        self.unidade = criar_unidade("Posto Fila")
        self.tipo = TipoServico.objects.create(nome="Tipo fila")
        self.servico = Servico.objects.create(
            nome="Serviço fila", classe=ClasseServico.objects.create(nome="Classe fila"),
            tipo_servico=self.tipo,
        )
        self.cidadao = Cidadao.objects.create(nome="Pessoa Fila", cpf="15350946056")
        self.usuario = criar_usuario("fila@teste.local", "52998224725", "Médico")
        self.usuario.unidades_lotacao.add(self.unidade)
        self.usuario.tipo_ofertados.add(self.tipo)
        dia = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"][timezone.localdate().weekday()]
        EscalaTrabalho.objects.create(
            profissional=self.usuario, unidade=self.unidade, dias_semana=[dia],
        )
        self.item = FilaEspera.objects.create(
            cidadao=self.cidadao, servico=self.servico, unidade=self.unidade,
            prioridade="NORMAL",
        )
        self.client.force_authenticate(self.usuario)

    def test_cria_agendamento_sem_vaga_e_remove_fila_atomicamente(self):
        resposta = self.client.post(self.url, {}, format="json")
        self.assertEqual(resposta.status_code, 201, resposta.content)
        agendamento = Agendamento.objects.get()
        self.assertEqual((agendamento.origem, agendamento.situacao), ("FILA", "CHAMANDO"))
        self.assertIsNone(agendamento.vaga_id)
        self.assertEqual(agendamento.atendente, self.usuario)
        self.assertFalse(FilaEspera.objects.exists())

    def test_falha_na_criacao_preserva_item_da_fila(self):
        with patch("fila_espera.views.Agendamento.objects.create", side_effect=RuntimeError("falha")):
            with self.assertRaises(RuntimeError):
                self.client.post(self.url, {}, format="json")
        self.assertTrue(FilaEspera.objects.filter(pk=self.item.pk).exists())
        self.assertFalse(Agendamento.objects.exists())
