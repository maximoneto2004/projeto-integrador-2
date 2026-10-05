from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from app.models import Bairro
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from medicamentos.tests import PAYLOAD, criar_usuario
from unidade_posto.models import UnidadePosto

URL_LOTE = "/api/v1/estoque/lote/"
URL_MOV = "/api/v1/estoque/movimentacao/"
URL_DISPENSAR = "/api/v1/estoque/dispensar/"
URL_SALDO = "/api/v1/estoque/saldo/"
URL_ALERTAS = "/api/v1/estoque/alertas/"

HOJE = timezone.localdate()


def criar_unidade(nome):
    return UnidadePosto.objects.create(
        nome=nome,
        logradouro="Rua A",
        numero="1",
        cep="60000000",
        bairro=Bairro.objects.get_or_create(nome="Centro")[0],
        telefone="8533333333",
        email=f"{nome.lower().replace(' ', '')}@posto.local",
    )


def criar_lote(medicamento, unidade, numero, quantidade, dias_validade):
    return LoteMedicamento.objects.create(
        medicamento=medicamento,
        unidade=unidade,
        numero_lote=numero,
        validade=HOJE + timedelta(days=dias_validade),
        quantidade_inicial=quantidade,
        quantidade_atual=quantidade,
    )


class EstoqueBaseTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.posto_a = criar_unidade("Posto A")
        self.posto_b = criar_unidade("Posto B")
        self.medicamento = Medicamento.objects.create(**PAYLOAD)

        self.supervisor = criar_usuario("sup@teste.local", "52998224725", "Supervisor")
        self.supervisor.unidades_lotacao.add(self.posto_a)
        self.medico = criar_usuario("medico@teste.local", "11144477735", "Médico")
        self.medico.unidades_lotacao.add(self.posto_a)
        self.client.force_authenticate(self.supervisor)


class LoteTests(EstoqueBaseTest):
    def _payload_lote(self, **extra):
        return {
            "medicamento": str(self.medicamento.id),
            "unidade": str(self.posto_a.id),
            "numero_lote": "L001",
            "validade": str(HOJE + timedelta(days=180)),
            "quantidade_inicial": 100,
            **extra,
        }

    def test_supervisor_registra_lote_com_movimentacao_de_entrada(self):
        resp = self.client.post(URL_LOTE, self._payload_lote(), format="json")
        self.assertEqual(resp.status_code, 201, resp.content)

        lote = LoteMedicamento.objects.get()
        self.assertEqual(lote.quantidade_atual, 100)
        mov = MovimentacaoEstoque.objects.get()
        self.assertEqual((mov.tipo, mov.quantidade, mov.saldo_apos, mov.usuario), ("ENTRADA", 100, 100, self.supervisor))

    def test_nao_registra_lote_em_unidade_onde_nao_esta_lotado(self):
        resp = self.client.post(URL_LOTE, self._payload_lote(unidade=str(self.posto_b.id)), format="json")
        self.assertEqual(resp.status_code, 403)
        self.assertFalse(LoteMedicamento.objects.exists())

    def test_nao_registra_lote_vencido(self):
        resp = self.client.post(URL_LOTE, self._payload_lote(validade=str(HOJE - timedelta(days=1))), format="json")
        self.assertEqual(resp.status_code, 400)

    def test_lote_duplicado_rejeitado(self):
        self.client.post(URL_LOTE, self._payload_lote(), format="json")
        self.assertEqual(self.client.post(URL_LOTE, self._payload_lote(), format="json").status_code, 400)

    def test_medico_consulta_mas_nao_registra_lote(self):
        self.client.force_authenticate(self.medico)
        self.assertEqual(self.client.get(URL_LOTE).status_code, 200)
        self.assertEqual(self.client.post(URL_LOTE, self._payload_lote(), format="json").status_code, 403)

    def test_edicao_nao_altera_quantidades(self):
        lote = criar_lote(self.medicamento, self.posto_a, "L1", 50, 100)
        resp = self.client.patch(
            f"{URL_LOTE}{lote.id}", {"quantidade_atual": 999, "quantidade_inicial": 999, "fornecedor": "X"}, format="json"
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        lote.refresh_from_db()
        self.assertEqual((lote.quantidade_atual, lote.quantidade_inicial, lote.fornecedor), (50, 50, "X"))

    def test_lista_so_lotes_das_unidades_do_usuario(self):
        criar_lote(self.medicamento, self.posto_a, "LA", 10, 100)
        criar_lote(self.medicamento, self.posto_b, "LB", 10, 100)
        resp = self.client.get(URL_LOTE)
        lotes = resp.json()["result"]
        self.assertEqual([l["numero_lote"] for l in lotes], ["LA"])

    def test_medicamento_com_lote_nao_pode_ser_excluido(self):
        criar_lote(self.medicamento, self.posto_a, "L1", 10, 100)
        admin = criar_usuario("admin@teste.local", "39053344705", "administrador")
        self.client.force_authenticate(admin)
        resp = self.client.delete(f"/api/v1/medicamento/{self.medicamento.id}")
        self.assertEqual(resp.status_code, 409)
        self.assertTrue(Medicamento.objects.filter(pk=self.medicamento.pk).exists())


class MovimentacaoTests(EstoqueBaseTest):
    def setUp(self):
        super().setUp()
        self.lote = criar_lote(self.medicamento, self.posto_a, "L1", 20, 100)

    def _movimentar(self, tipo, quantidade, motivo=None):
        payload = {"lote": str(self.lote.id), "tipo": tipo, "quantidade": quantidade}
        if motivo:
            payload["motivo"] = motivo
        return self.client.post(URL_MOV, payload, format="json")

    def test_perda_exige_motivo(self):
        self.assertEqual(self._movimentar("PERDA", 5).status_code, 400)
        resp = self._movimentar("PERDA", 5, "Frasco quebrado")
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(resp.json()["result"]["quantidade"], -5)
        self.lote.refresh_from_db()
        self.assertEqual(self.lote.quantidade_atual, 15)

    def test_saida_maior_que_saldo_rejeitada(self):
        self.assertEqual(self._movimentar("SAIDA", 21).status_code, 400)
        self.lote.refresh_from_db()
        self.assertEqual(self.lote.quantidade_atual, 20)

    def test_ajuste_negativo_e_ajuste_zero(self):
        self.assertEqual(self._movimentar("AJUSTE", -3, "Inventário").status_code, 201)
        self.assertEqual(self._movimentar("AJUSTE", 0, "Inventário").status_code, 400)
        self.lote.refresh_from_db()
        self.assertEqual(self.lote.quantidade_atual, 17)

    def test_entrada_com_quantidade_negativa_rejeitada(self):
        self.assertEqual(self._movimentar("ENTRADA", -5).status_code, 400)

    def test_saida_de_lote_vencido_bloqueada_mas_perda_permitida(self):
        self.lote.validade = HOJE - timedelta(days=1)
        self.lote.save()
        self.assertEqual(self._movimentar("SAIDA", 1).status_code, 400)
        self.assertEqual(self._movimentar("PERDA", 20, "Vencido").status_code, 201)

    def test_medico_nao_movimenta(self):
        self.client.force_authenticate(self.medico)
        self.assertEqual(self._movimentar("SAIDA", 1).status_code, 403)


class DispensacaoTests(EstoqueBaseTest):
    def _dispensar(self, quantidade, unidade=None):
        return self.client.post(
            URL_DISPENSAR,
            {
                "medicamento": str(self.medicamento.id),
                "unidade": str((unidade or self.posto_a).id),
                "quantidade": quantidade,
            },
            format="json",
        )

    def test_dispensa_primeiro_o_lote_que_vence_antes(self):
        longe = criar_lote(self.medicamento, self.posto_a, "LONGE", 50, 200)
        perto = criar_lote(self.medicamento, self.posto_a, "PERTO", 10, 10)

        resp = self._dispensar(12)
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual([m["lote_numero"] for m in resp.json()["result"]], ["PERTO", "LONGE"])

        perto.refresh_from_db()
        longe.refresh_from_db()
        self.assertEqual((perto.quantidade_atual, longe.quantidade_atual), (0, 48))

    def test_ignora_lote_vencido_e_nao_altera_nada_se_insuficiente(self):
        vencido = criar_lote(self.medicamento, self.posto_a, "VENC", 100, -1)
        valido = criar_lote(self.medicamento, self.posto_a, "OK", 5, 30)

        resp = self._dispensar(6)
        self.assertEqual(resp.status_code, 400)
        vencido.refresh_from_db()
        valido.refresh_from_db()
        self.assertEqual((vencido.quantidade_atual, valido.quantidade_atual), (100, 5))
        self.assertFalse(MovimentacaoEstoque.objects.exists())

    def test_nao_dispensa_em_unidade_onde_nao_esta_lotado(self):
        criar_lote(self.medicamento, self.posto_b, "LB", 10, 30)
        self.assertEqual(self._dispensar(1, unidade=self.posto_b).status_code, 403)


class SaldoAlertasTests(EstoqueBaseTest):
    def test_saldo_separa_disponivel_de_vencido(self):
        criar_lote(self.medicamento, self.posto_a, "OK", 30, 30)
        criar_lote(self.medicamento, self.posto_a, "VENC", 7, -1)
        saldo = self.client.get(URL_SALDO).json()["result"]
        self.assertEqual(len(saldo), 1)
        self.assertEqual((saldo[0]["saldo_disponivel"], saldo[0]["saldo_vencido"]), (30, 7))

    def test_alertas(self):
        self.medicamento.estoque_minimo = 100
        self.medicamento.save()
        outro = Medicamento.objects.create(**{**PAYLOAD, "nome": "Amoxicilina", "estoque_minimo": 10})

        criar_lote(self.medicamento, self.posto_a, "VENCENDO", 50, 10)
        criar_lote(self.medicamento, self.posto_a, "LONGE", 5, 200)
        criar_lote(self.medicamento, self.posto_a, "VENCIDO", 3, -2)
        criar_lote(self.medicamento, self.posto_b, "OUTRA_UNIDADE", 1, 5)

        resultado = self.client.get(URL_ALERTAS, {"dias": 30}).json()["result"]

        baixos = {(a["medicamento_id"], a["saldo_disponivel"]) for a in resultado["estoque_baixo"]}
        self.assertEqual(baixos, {(str(self.medicamento.id), 55), (str(outro.id), 0)})
        self.assertEqual([l["numero_lote"] for l in resultado["vencendo"]], ["VENCENDO"])
        self.assertEqual([l["numero_lote"] for l in resultado["vencidos"]], ["VENCIDO"])

    def test_parametro_invalido(self):
        self.assertEqual(self.client.get(URL_ALERTAS, {"dias": "abc"}).status_code, 400)
        self.assertEqual(self.client.get(URL_SALDO, {"unidade": "nao-e-uuid"}).status_code, 400)


class ListagemPaginadaTests(EstoqueBaseTest):
    def setUp(self):
        super().setUp()
        for i in range(3):
            criar_lote(self.medicamento, self.posto_a, f"L00{i}", 10, 90 + i)
        self.outro = Medicamento.objects.create(**{**PAYLOAD, "nome": "Amoxicilina", "principio_ativo": "Amoxicilina"})
        criar_lote(self.outro, self.posto_a, "AMX1", 5, 90)

    def test_lotes_paginados_com_limit_offset(self):
        resp = self.client.get(URL_LOTE, {"unidade": str(self.posto_a.id), "limit": 2, "offset": 2})
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.data["count"], 4)
        self.assertEqual(len(resp.data["results"]["result"]), 2)

    def test_lotes_sem_limit_continuam_sem_paginacao(self):
        resp = self.client.get(URL_LOTE, {"unidade": str(self.posto_a.id)})
        self.assertEqual(len(resp.data["result"]), 4)

    def test_busca_lote_por_medicamento_ou_numero(self):
        por_nome = self.client.get(URL_LOTE, {"busca": "amoxi"}).data["result"]
        self.assertEqual([l["numero_lote"] for l in por_nome], ["AMX1"])
        por_numero = self.client.get(URL_LOTE, {"busca": "l001"}).data["result"]
        self.assertEqual([l["numero_lote"] for l in por_numero], ["L001"])

    def test_movimentacoes_paginadas_e_com_busca(self):
        for lote in LoteMedicamento.objects.all():
            self.client.post(URL_MOV, {"lote": str(lote.id), "tipo": "SAIDA", "quantidade": 1}, format="json")
        resp = self.client.get(URL_MOV, {"busca": "amoxicilina", "limit": 10})
        self.assertEqual(resp.data["count"], 1)
        self.assertEqual(resp.data["results"]["result"][0]["lote_numero"], "AMX1")
