from datetime import time, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import AgendaVaga, Agendamento
from agendamentos.services import cancelar_agendamento
from cidadaos.autenticacao import CidadaoAccessToken
from cidadaos.models import Cidadao
from medicamentos.models import Medicamento
from medicamentos.tests import PAYLOAD
from medicamentos.tests_estoque import criar_lote, criar_unidade
from prontuario.models import Receita, ReceitaMedicamento
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import ServicoUnidadePosto

URL_AGENDAMENTOS = "/api/v1/cidadaos/eu/agendamentos/"
URL_RECEITAS = "/api/v1/cidadaos/eu/receitas/"
AMANHA = timezone.localdate() + timedelta(days=1)


class AreaCidadaoBaseTest(TestCase):
    def setUp(self):
        self.unidade = criar_unidade("Posto A")
        self.tipo = TipoServico.objects.create(nome="Consulta Médica")
        self.servico = Servico.objects.create(
            nome="Consulta Clínica Geral",
            classe=ClasseServico.objects.create(nome="Atenção Básica"),
            tipo_servico=self.tipo,
        )
        ServicoUnidadePosto.objects.bulk_create([ServicoUnidadePosto(unidade=self.unidade, servico=self.servico)])
        self.cidadao = Cidadao.objects.create(nome="Maria Silva", cpf="15350946056", email="maria@exemplo.com")
        self.outro = Cidadao.objects.create(nome="Joao Souza", cpf="52998224725")
        self.client = APIClient()
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {CidadaoAccessToken.para_cidadao(self.cidadao)}")

    def _vaga(self, data=AMANHA, horario=time(9, 0), vagas=2):
        return AgendaVaga.objects.create(
            unidade=self.unidade, tipo_servico=self.tipo, data=data, horario=horario, vagas=vagas
        )

    def _agendamento(self, cidadao, vaga):
        return Agendamento.objects.create(cidadao=cidadao, unidade=self.unidade, servico=self.servico, vaga=vaga)


class MeusAgendamentosTest(AreaCidadaoBaseTest):
    def test_lista_apenas_os_do_proprio_cidadao(self):
        vaga = self._vaga()
        meu = self._agendamento(self.cidadao, vaga)
        self._agendamento(self.outro, vaga)
        resp = self.client.get(URL_AGENDAMENTOS, {"cidadao": str(self.outro.id)})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([a["id"] for a in resp.data["result"]], [str(meu.id)])

    def test_agenda_para_o_cidadao_do_token(self):
        vaga = self._vaga()
        resp = self.client.post(
            URL_AGENDAMENTOS,
            {"vaga": str(vaga.id), "servico": str(self.servico.id), "cidadao": str(self.outro.id)},
            format="json",
        )
        self.assertEqual(resp.status_code, 201, resp.data)
        agendamento = Agendamento.objects.get()
        self.assertEqual(agendamento.cidadao, self.cidadao)
        self.assertEqual(agendamento.situacao, "AGENDADO")
        self.assertEqual(agendamento.origem, "SITE")
        self.assertEqual(resp.data["result"]["unidade"]["nome"], "Posto A")
        vaga.refresh_from_db()
        self.assertEqual(vaga.vagas_ocupadas, 1)

    def test_recusa_vaga_que_ja_passou(self):
        vaga = self._vaga(data=timezone.localdate() - timedelta(days=1))
        resp = self.client.post(URL_AGENDAMENTOS, {"vaga": str(vaga.id), "servico": str(self.servico.id)}, format="json")
        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Agendamento.objects.exists())

    def test_recusa_servico_nao_agendavel_na_unidade(self):
        outro_servico = Servico.objects.create(nome="Vacina", classe=self.servico.classe, tipo_servico=self.tipo)
        vaga = self._vaga()
        resp = self.client.post(URL_AGENDAMENTOS, {"vaga": str(vaga.id), "servico": str(outro_servico.id)}, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_recusa_vaga_cheia(self):
        vaga = self._vaga(vagas=1)
        self._agendamento(self.outro, vaga)
        resp = self.client.post(URL_AGENDAMENTOS, {"vaga": str(vaga.id), "servico": str(self.servico.id)}, format="json")
        self.assertEqual(resp.status_code, 409)

    def test_cancela_o_proprio_agendamento_e_libera_a_vaga_uma_vez(self):
        vaga = self._vaga(vagas=2)
        meu = self._agendamento(self.cidadao, vaga)
        self._agendamento(self.outro, vaga)
        resp = self.client.post(f"{URL_AGENDAMENTOS}{meu.id}/cancelar/")
        self.assertEqual(resp.status_code, 200)
        meu.refresh_from_db()
        vaga.refresh_from_db()
        self.assertEqual(meu.situacao, "CANCELADO_CIDADAO")
        self.assertEqual(vaga.vagas_ocupadas, 1)

    def test_nao_cancela_agendamento_de_outro_cidadao(self):
        alheio = self._agendamento(self.outro, self._vaga())
        self.assertEqual(self.client.post(f"{URL_AGENDAMENTOS}{alheio.id}/cancelar/").status_code, 404)
        alheio.refresh_from_db()
        self.assertEqual(alheio.situacao, "AGENDADO")

    def test_nao_cancela_agendamento_ja_iniciado(self):
        meu = self._agendamento(self.cidadao, self._vaga())
        Agendamento.objects.filter(pk=meu.pk).update(situacao="ATENDIMENTO")
        self.assertEqual(self.client.post(f"{URL_AGENDAMENTOS}{meu.id}/cancelar/").status_code, 400)

    def test_cancelamento_pela_unidade_libera_a_vaga_uma_vez(self):
        vaga = self._vaga(vagas=2)
        primeiro = self._agendamento(self.cidadao, vaga)
        self._agendamento(self.outro, vaga)
        cancelar_agendamento(primeiro.pk)
        vaga.refresh_from_db()
        self.assertEqual(vaga.vagas_ocupadas, 1)

    def test_exige_token_de_cidadao(self):
        self.client.credentials()
        self.assertEqual(self.client.get(URL_AGENDAMENTOS).status_code, 401)


class MinhasReceitasTest(AreaCidadaoBaseTest):
    def setUp(self):
        super().setUp()
        self.dipirona = Medicamento.objects.create(**PAYLOAD)
        self.receita = self._receita(self.cidadao, quantidade=10)

    def _receita(self, cidadao, quantidade):
        agendamento = Agendamento.objects.bulk_create(
            [
                Agendamento(
                    cidadao=cidadao,
                    unidade=self.unidade,
                    servico=self.servico,
                    data=timezone.localdate(),
                    horario=time(8, 0),
                    situacao="FINALIZADO",
                )
            ]
        )[0]
        receita = Receita.objects.create(agendamento=agendamento, cidadao=cidadao, diagnostico="Sigiloso")
        ReceitaMedicamento.objects.create(
            receita=receita,
            medicamento=self.dipirona,
            nome=str(self.dipirona),
            dosagem="500 mg",
            frequencia="8/8h",
            duracao="5 dias",
            quantidade_prescrita=quantidade,
        )
        return receita

    def test_lista_apenas_as_proprias_sem_diagnostico(self):
        self._receita(self.outro, quantidade=5)
        resp = self.client.get(URL_RECEITAS, {"vigente": "true"})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual([r["id"] for r in resp.data["result"]], [str(self.receita.id)])
        self.assertNotIn("diagnostico", resp.data["result"][0])
        self.assertEqual(resp.data["result"][0]["medicamentos"][0]["quantidade_restante"], 10)

    def test_nao_detalha_receita_de_outro_cidadao(self):
        alheia = self._receita(self.outro, quantidade=5)
        self.assertEqual(self.client.get(f"{URL_RECEITAS}{alheia.id}/").status_code, 404)
        self.assertEqual(self.client.get(f"{URL_RECEITAS}{alheia.id}/disponibilidade/").status_code, 404)

    def test_disponibilidade_considera_so_estoque_valido(self):
        posto_b = criar_unidade("Posto B")
        posto_c = criar_unidade("Posto C")
        criar_lote(self.dipirona, self.unidade, "L1", 20, dias_validade=30)
        criar_lote(self.dipirona, posto_b, "L2", 4, dias_validade=30)
        criar_lote(self.dipirona, posto_c, "L3", 50, dias_validade=-1)
        resp = self.client.get(f"{URL_RECEITAS}{self.receita.id}/disponibilidade/")
        self.assertEqual(resp.status_code, 200)
        unidades = {u["unidade"]: u["suficiente"] for u in resp.data["result"]["itens"][0]["unidades"]}
        self.assertEqual(unidades, {"Posto A": True, "Posto B": False})


class BairroPublicoTest(TestCase):
    def test_lista_bairros_sem_autenticacao(self):
        self.assertEqual(APIClient().get("/api/v1/bairro/").status_code, 200)
