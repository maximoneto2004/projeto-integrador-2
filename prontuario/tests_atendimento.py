from datetime import time

from agendamentos.models import Agendamento
from cidadaos.models import Cidadao
from prontuario.models import RegistroAtendimento
from prontuario.tests_receita import HOJE, ReceitaBaseTest

URL_ATENDIMENTO = "/api/prontuario/atendimento/"


def url_prontuario(cidadao):
    return f"/api/prontuario/cidadao/{cidadao.id}/"


class RegistroAtendimentoBaseTest(ReceitaBaseTest):
    def _payload(self, **extra):
        return {
            "agendamento": str(self.agendamento.id),
            "queixa_principal": "Dor de garganta há 3 dias",
            "subjetivo": "Febre baixa, sem tosse.",
            "avaliacao": "Faringite viral",
            "cid": "j02.9",
            "plano": "Sintomáticos e retorno se piora.",
            "pressao_sistolica": 120,
            "pressao_diastolica": 80,
            "temperatura": "37.8",
            "peso": "70",
            "altura": 175,
            **extra,
        }

    def _registrar(self, usuario=None, **extra):
        self.client.force_authenticate(usuario or self.medico)
        return self.client.post(URL_ATENDIMENTO, self._payload(**extra), format="json")

    def _novo_agendamento(self, situacao="ATENDIMENTO"):
        return Agendamento.objects.bulk_create(
            [
                Agendamento(
                    cidadao=self.cidadao,
                    unidade=self.unidade,
                    servico=self.agendamento.servico,
                    data=HOJE,
                    horario=time(10, 0),
                    situacao=situacao,
                )
            ]
        )[0]


class CriacaoRegistroTests(RegistroAtendimentoBaseTest):
    def test_medico_registra_atendimento(self):
        resp = self._registrar()
        self.assertEqual(resp.status_code, 201, resp.content)

        registro = resp.json()["result"]
        self.assertEqual(registro["cidadao"], str(self.cidadao.id))
        self.assertEqual(registro["unidade"], str(self.unidade.id))
        self.assertEqual(registro["profissional"], str(self.medico.id))
        self.assertEqual(registro["cid"], "J02.9")
        self.assertEqual(registro["imc"], "22.9")
        self.assertEqual(registro["servico_nome"], "Consulta Clínica Geral")

    def test_enfermeiro_registra_triagem(self):
        resp = self._registrar(
            self.enfermeiro, classificacao_risco="AMARELO", avaliacao="", cid="", plano="Encaminhar ao médico"
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()["result"]["classificacao_risco_display"], "Amarelo - Urgente")
        self.assertIsNone(resp.json()["result"]["cid"])

    def test_um_registro_por_agendamento(self):
        self.assertEqual(self._registrar().status_code, 201)
        self.assertEqual(self._registrar().status_code, 400)

    def test_agendamento_ainda_nao_iniciado(self):
        agendado = self._novo_agendamento("AGENDADO")
        self.assertEqual(self._registrar(agendamento=str(agendado.id)).status_code, 400)

    def test_validacoes_clinicas(self):
        casos = [
            {"pressao_diastolica": None},
            {"pressao_sistolica": 80, "pressao_diastolica": 90},
            {"temperatura": "50"},
            {"saturacao_o2": 120},
            {"cid": "XYZ"},
            {"queixa_principal": ""},
        ]
        for extra in casos:
            with self.subTest(extra=extra):
                self.assertEqual(self._registrar(**extra).status_code, 400)
        self.assertFalse(RegistroAtendimento.objects.exists())

    def test_supervisor_e_usuario_sem_grupo_nao_acessam(self):
        self.assertEqual(self._registrar(self.supervisor).status_code, 403)
        self.client.force_authenticate(self.supervisor)
        self.assertEqual(self.client.get(url_prontuario(self.cidadao)).status_code, 403)


class EdicaoRegistroTests(RegistroAtendimentoBaseTest):
    def setUp(self):
        super().setUp()
        self.registro_id = self._registrar(self.enfermeiro).json()["result"]["id"]
        self.url = f"{URL_ATENDIMENTO}{self.registro_id}/"

    def test_autor_edita(self):
        self.client.force_authenticate(self.enfermeiro)
        resp = self.client.patch(self.url, {"plano": "Retorno em 7 dias"}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual(resp.json()["result"]["plano"], "Retorno em 7 dias")

    def test_outro_profissional_nao_edita(self):
        self.client.force_authenticate(self.medico)
        self.assertEqual(self.client.patch(self.url, {"plano": "X"}, format="json").status_code, 403)

    def test_nao_troca_agendamento_nem_exclui(self):
        self.client.force_authenticate(self.enfermeiro)
        outro = self._novo_agendamento()
        self.assertEqual(self.client.patch(self.url, {"agendamento": str(outro.id)}, format="json").status_code, 400)
        self.assertIn(self.client.delete(self.url).status_code, (403, 405))
        self.assertTrue(RegistroAtendimento.objects.filter(pk=self.registro_id).exists())

    def test_busca_por_agendamento(self):
        self.client.force_authenticate(self.medico)
        resp = self.client.get(URL_ATENDIMENTO, {"agendamento": str(self.agendamento.id)})
        self.assertEqual([r["id"] for r in resp.json()["result"]], [self.registro_id])


class ProntuarioCidadaoTests(RegistroAtendimentoBaseTest):
    def test_linha_do_tempo(self):
        self._registrar()
        self._criar_receita()
        self.client.force_authenticate(self.enfermeiro)

        resp = self.client.get(url_prontuario(self.cidadao))
        self.assertEqual(resp.status_code, 200, resp.content)
        prontuario = resp.json()["result"]
        self.assertEqual(prontuario["cidadao"]["nome"], "Maria Silva")
        self.assertEqual(len(prontuario["atendimentos"]), 1)
        self.assertEqual(len(prontuario["receitas"]), 1)

    def test_dados_clinicos(self):
        url = f"{url_prontuario(self.cidadao)}dados-clinicos/"
        self.client.force_authenticate(self.medico)

        resp = self.client.patch(
            url, {"cns": "898 0010 1234 5678", "alergias": "Dipirona", "condicoes_cronicas": "Hipertensão"}, format="json"
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        self.cidadao.refresh_from_db()
        self.assertEqual((self.cidadao.cns, self.cidadao.alergias), ("898001012345678", "Dipirona"))

        self.assertEqual(self.client.patch(url, {"cns": "123"}, format="json").status_code, 400)

        outro = Cidadao.objects.create(nome="João", cpf="52998224725")
        resp = self.client.patch(f"{url_prontuario(outro)}dados-clinicos/", {"cns": "898001012345678"}, format="json")
        self.assertEqual(resp.status_code, 400)

        self.client.force_authenticate(self.supervisor)
        self.assertEqual(self.client.patch(url, {"alergias": "X"}, format="json").status_code, 403)
