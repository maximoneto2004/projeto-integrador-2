from datetime import time, timedelta

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import Agendamento
from cidadaos.models import Cidadao
from medicamentos.models import Medicamento, MovimentacaoEstoque
from medicamentos.tests import PAYLOAD, criar_usuario
from medicamentos.tests_estoque import criar_lote, criar_unidade
from prontuario.models import Receita, ReceitaMedicamento
from servicos.models import ClasseServico, Servico, TipoServico

URL_RECEITA = "/api/prontuario/receita/"
URL_DISPENSAR = "/api/v1/estoque/dispensar/"
HOJE = timezone.localdate()


class ReceitaBaseTest(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.unidade = criar_unidade("Posto A")
        servico = Servico.objects.create(
            nome="Consulta Clínica Geral",
            classe=ClasseServico.objects.create(nome="Atenção Básica"),
            tipo_servico=TipoServico.objects.create(nome="Consulta Médica"),
            gera_receita=True,
        )
        self.cidadao = Cidadao.objects.create(nome="Maria Silva", cpf="15350946056")
        # bulk_create evita a lógica de ocupação de vagas do Agendamento.save, irrelevante aqui.
        self.agendamento = Agendamento.objects.bulk_create(
            [
                Agendamento(
                    cidadao=self.cidadao,
                    unidade=self.unidade,
                    servico=servico,
                    data=HOJE,
                    horario=time(9, 0),
                    situacao="ATENDIMENTO",
                )
            ]
        )[0]

        self.dipirona = Medicamento.objects.create(**PAYLOAD)
        self.amoxicilina = Medicamento.objects.create(
            **{**PAYLOAD, "nome": "Amoxicilina", "principio_ativo": "Amoxicilina", "forma_farmaceutica": "CAPSULA"}
        )

        self.medico = criar_usuario("medico@teste.local", "11144477735", "Médico")
        self.enfermeiro = criar_usuario("enf@teste.local", "39053344705", "Enfermeiro")
        self.supervisor = criar_usuario("sup@teste.local", "52998224725", "Supervisor")
        self.medico.unidades_lotacao.add(self.unidade)
        self.enfermeiro.unidades_lotacao.add(self.unidade)
        self.supervisor.unidades_lotacao.add(self.unidade)
        Agendamento.objects.filter(pk=self.agendamento.pk).update(atendente=self.medico)
        self.agendamento.atendente = self.medico

    def _item(self, medicamento, quantidade=10, **extra):
        return {
            "medicamento": str(medicamento.id),
            "frequencia": "8/8h",
            "duracao": "5 dias",
            "quantidade_prescrita": quantidade,
            **extra,
        }

    def _criar_receita(self, itens=None, **extra):
        self.client.force_authenticate(self.medico)
        payload = {"agendamento": str(self.agendamento.id), "medicamentos": itens or [self._item(self.dipirona)], **extra}
        return self.client.post(URL_RECEITA, payload, format="json")


class ReceitaCriacaoTests(ReceitaBaseTest):
    def test_medico_emite_receita_vinculada_ao_medicamento(self):
        resp = self._criar_receita()
        self.assertEqual(resp.status_code, 201, resp.content)

        receita = resp.json()["result"]
        self.assertEqual(receita["data_validade"], str(HOJE + timedelta(days=30)))
        self.assertFalse(receita["vencida"])
        self.assertEqual(receita["status_dispensacao"], "PENDENTE")

        item = receita["medicamentos"][0]
        self.assertEqual(item["medicamento"], str(self.dipirona.id))
        self.assertEqual(item["nome"], str(self.dipirona))
        self.assertEqual(item["dosagem"], "500 mg")
        self.assertEqual((item["quantidade_restante"], item["legado"]), (10, False))

    def test_validade_personalizada_e_dosagem_informada(self):
        resp = self._criar_receita(itens=[self._item(self.dipirona, dosagem="1 g")], validade_dias=10)
        receita = resp.json()["result"]
        self.assertEqual(receita["data_validade"], str(HOJE + timedelta(days=10)))
        self.assertEqual(receita["medicamentos"][0]["dosagem"], "1 g")

    def test_enfermeiro_consulta_mas_nao_prescreve(self):
        self.client.force_authenticate(self.enfermeiro)
        payload = {"agendamento": str(self.agendamento.id), "medicamentos": [self._item(self.dipirona)]}
        self.assertEqual(self.client.post(URL_RECEITA, payload, format="json").status_code, 403)
        self.assertEqual(self.client.get(URL_RECEITA).status_code, 200)

    def test_validacoes(self):
        sem_quantidade = self._item(self.dipirona)
        del sem_quantidade["quantidade_prescrita"]
        self.assertEqual(self._criar_receita(itens=[sem_quantidade]).status_code, 400)

        duplicado = [self._item(self.dipirona), self._item(self.dipirona)]
        self.assertEqual(self._criar_receita(itens=duplicado).status_code, 400)

        self.assertEqual(self._criar_receita(validade_dias=0).status_code, 400)

        self.amoxicilina.is_active = False
        self.amoxicilina.save()
        self.assertEqual(self._criar_receita(itens=[self._item(self.amoxicilina)]).status_code, 400)

        self.assertFalse(Receita.objects.exists())

    def test_item_legado_em_texto_livre_continua_legivel(self):
        receita = Receita.objects.create(agendamento=self.agendamento, cidadao=self.cidadao)
        ReceitaMedicamento.objects.create(
            receita=receita, nome="Dipirona 500mg", dosagem="500mg", frequencia="6/6h", duracao="3 dias"
        )
        self.client.force_authenticate(self.medico)
        item = self.client.get(f"{URL_RECEITA}{receita.id}/").json()["result"]["medicamentos"][0]
        self.assertEqual((item["medicamento"], item["legado"], item["nome"]), (None, True, "Dipirona 500mg"))

    def test_servico_sem_permissao_de_receita(self):
        self.agendamento.servico.gera_receita = False
        self.agendamento.servico.save()
        self.assertEqual(self._criar_receita().status_code, 400)

    def test_profissional_nao_atribuido(self):
        Agendamento.objects.filter(pk=self.agendamento.pk).update(atendente=self.enfermeiro)
        self.assertEqual(self._criar_receita().status_code, 403)

    def test_profissional_fora_da_unidade(self):
        self.medico.unidades_lotacao.clear()
        self.assertEqual(self._criar_receita().status_code, 403)

    def test_cidadao_divergente(self):
        outro = Cidadao.objects.create(nome="Outro", cpf="52998224725")
        self.assertEqual(self._criar_receita(cidadao=str(outro.id)).status_code, 400)

    def test_estado_invalido(self):
        Agendamento.objects.filter(pk=self.agendamento.pk).update(situacao="AGENDADO")
        self.agendamento.situacao = "AGENDADO"
        self.assertEqual(self._criar_receita().status_code, 400)


class ReceitaAposDispensacaoTests(ReceitaBaseTest):
    def setUp(self):
        super().setUp()
        self.receita_id = self._criar_receita().json()["result"]["id"]
        self.item = ReceitaMedicamento.objects.get(receita_id=self.receita_id)
        self.item.registrar_dispensacao(3)

    def test_nao_altera_itens_mas_altera_observacoes(self):
        url = f"{URL_RECEITA}{self.receita_id}/"
        resp = self.client.patch(url, {"medicamentos": [self._item(self.amoxicilina)]}, format="json")
        self.assertEqual(resp.status_code, 400)
        resp = self.client.patch(url, {"observacoes": "Retornar em 7 dias"}, format="json")
        self.assertEqual(resp.status_code, 200, resp.content)

    def test_nao_exclui(self):
        self.assertEqual(self.client.delete(f"{URL_RECEITA}{self.receita_id}/").status_code, 409)
        self.assertTrue(Receita.objects.filter(pk=self.receita_id).exists())


class ReceitaEdicaoTests(ReceitaBaseTest):
    def test_substitui_itens_e_recalcula_validade_antes_de_dispensar(self):
        receita_id = self._criar_receita().json()["result"]["id"]
        resp = self.client.patch(
            f"{URL_RECEITA}{receita_id}/",
            {"validade_dias": 5, "medicamentos": [self._item(self.amoxicilina, 21)]},
            format="json",
        )
        self.assertEqual(resp.status_code, 200, resp.content)
        receita = resp.json()["result"]
        self.assertEqual(receita["data_validade"], str(HOJE + timedelta(days=5)))
        self.assertEqual([m["medicamento"] for m in receita["medicamentos"]], [str(self.amoxicilina.id)])

    def test_exclui_receita_sem_dispensacao(self):
        receita_id = self._criar_receita().json()["result"]["id"]
        self.assertEqual(self.client.delete(f"{URL_RECEITA}{receita_id}/").status_code, 200)


class ReceitaFiltrosTests(ReceitaBaseTest):
    def test_filtros_vigente_e_pendente(self):
        pendente = self._criar_receita().json()["result"]["id"]
        vencida = self._criar_receita().json()["result"]["id"]
        Receita.objects.filter(pk=vencida).update(data_validade=HOJE - timedelta(days=1))
        dispensada = self._criar_receita().json()["result"]["id"]
        ReceitaMedicamento.objects.get(receita_id=dispensada).registrar_dispensacao(10)

        def ids(params):
            return {r["id"] for r in self.client.get(URL_RECEITA, params).json()["result"]}

        self.assertEqual(ids({"vigente": "true"}), {pendente, dispensada})
        self.assertEqual(ids({"vigente": "false"}), {vencida})
        self.assertEqual(ids({"pendente_dispensacao": "true"}), {pendente, vencida})
        self.assertEqual(ids({"pendente_dispensacao": "false"}), {dispensada})
        self.assertEqual(ids({"medicamento": str(self.dipirona.id)}), {pendente, vencida, dispensada})

    def test_listagem_nao_expoe_receita_de_outra_unidade(self):
        visivel = self._criar_receita().json()["result"]["id"]
        outra_unidade = criar_unidade("Posto B")
        outro_agendamento = Agendamento.objects.bulk_create([Agendamento(
            cidadao=self.cidadao, unidade=outra_unidade, servico=self.agendamento.servico,
            atendente=self.medico, data=HOJE, horario=time(12), situacao="ATENDIMENTO",
        )])[0]
        oculta = Receita.objects.create(
            agendamento=outro_agendamento, cidadao=self.cidadao, profissional=self.medico,
        )
        ids = {item["id"] for item in self.client.get(URL_RECEITA).json()["result"]}
        self.assertEqual(ids, {visivel})
        self.assertNotIn(str(oculta.id), ids)


class DispensacaoPorReceitaTests(ReceitaBaseTest):
    def setUp(self):
        super().setUp()
        self.lote = criar_lote(self.dipirona, self.unidade, "L1", 100, 90)
        receita = self._criar_receita().json()["result"]
        self.receita_id = receita["id"]
        self.item = ReceitaMedicamento.objects.get(pk=receita["medicamentos"][0]["id"])
        self.client.force_authenticate(self.supervisor)

    def _dispensar(self, **extra):
        payload = {"unidade": str(self.unidade.id), "receita_item": str(self.item.id), **extra}
        return self.client.post(URL_DISPENSAR, payload, format="json")

    def test_dispensa_o_restante_quando_quantidade_nao_informada(self):
        resp = self._dispensar()
        self.assertEqual(resp.status_code, 201, resp.content)

        self.item.refresh_from_db()
        self.lote.refresh_from_db()
        self.assertEqual((self.item.quantidade_dispensada, self.item.status_dispensacao), (10, "DISPENSADO"))
        self.assertEqual(self.lote.quantidade_atual, 90)
        self.assertEqual(MovimentacaoEstoque.objects.get(tipo="SAIDA").receita_item, self.item)

        receita = self.client.get(f"{URL_RECEITA}{self.receita_id}/").json()["result"]
        self.assertEqual(receita["status_dispensacao"], "DISPENSADO")
        self.assertEqual(self._dispensar().status_code, 400)

    def test_dispensacao_parcial_e_limite_do_prescrito(self):
        self.assertEqual(self._dispensar(quantidade=4).status_code, 201)
        self.item.refresh_from_db()
        self.assertEqual((self.item.status_dispensacao, self.item.quantidade_restante), ("PARCIAL", 6))

        self.assertEqual(self._dispensar(quantidade=7).status_code, 400)
        self.lote.refresh_from_db()
        self.assertEqual(self.lote.quantidade_atual, 96)

    def test_receita_vencida_nao_dispensa(self):
        Receita.objects.filter(pk=self.receita_id).update(data_validade=HOJE - timedelta(days=1))
        self.assertEqual(self._dispensar().status_code, 400)
        self.lote.refresh_from_db()
        self.item.refresh_from_db()
        self.assertEqual((self.lote.quantidade_atual, self.item.quantidade_dispensada), (100, 0))

    def test_medicamento_divergente(self):
        self.assertEqual(self._dispensar(medicamento=str(self.amoxicilina.id)).status_code, 400)

    def test_item_legado_nao_dispensa_pelo_estoque(self):
        legado = ReceitaMedicamento.objects.create(
            receita_id=self.receita_id, nome="Xarope", dosagem="5 mL", frequencia="8/8h", duracao="3 dias"
        )
        resp = self.client.post(
            URL_DISPENSAR, {"unidade": str(self.unidade.id), "receita_item": str(legado.id)}, format="json"
        )
        self.assertEqual(resp.status_code, 400)

    def test_estoque_insuficiente_nao_altera_receita(self):
        self.lote.quantidade_atual = 3
        self.lote.save()
        self.assertEqual(self._dispensar().status_code, 400)
        self.item.refresh_from_db()
        self.assertEqual(self.item.quantidade_dispensada, 0)
