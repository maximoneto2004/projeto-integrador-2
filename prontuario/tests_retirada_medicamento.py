from datetime import time, timedelta

from django.core.cache import cache

from agendamentos.models import AgendaVaga, Agendamento, ChamadaPainel
from cidadaos.models import Cidadao
from medicamentos.models import MovimentacaoEstoque
from medicamentos.tests import criar_usuario
from medicamentos.tests_estoque import criar_lote, criar_unidade
from prontuario.models import Receita
from prontuario.tests_receita import HOJE, URL_DISPENSAR, URL_RECEITA, ReceitaBaseTest
from unidade_posto.models import Guiche

URL_AGENDAMENTOS = "/api/v1/agendamentos/"
URL_ATENDIMENTO = "/api/prontuario/atendimento/"


class RetiradaMedicamentoBaseTest(ReceitaBaseTest):
    def setUp(self):
        super().setUp()
        self.farmaceutico = criar_usuario("farm@teste.local", "86288366757", "Farmacêutico")
        self.farmaceutico.unidades_lotacao.add(self.unidade)
        self.guiche = Guiche.objects.create(unidade=self.unidade, nome="Farmácia")
        self.farmaceutico.guiche_atual = self.guiche
        self.farmaceutico.save(update_fields=["guiche_atual"])
        self.outro_farmaceutico = criar_usuario("farm2@teste.local", "12345678909", "Farmacêutico")
        self.outro_farmaceutico.unidades_lotacao.add(self.unidade)
        # O PATCH passa por Agendamento.save, que exige vaga em agendamentos ativos.
        self.vaga = self._vaga(time(9, 0))
        Agendamento.objects.filter(pk=self.agendamento.pk).update(vaga=self.vaga)

    def _vaga(self, horario):
        return AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=self.agendamento.servico.tipo_servico,
            data=HOJE,
            horario=horario,
            vagas=5,
            vagas_ocupadas=1,
        )

    def _prescrever(self, retirada_imediata):
        resp = self._criar_receita(retirada_imediata=retirada_imediata)
        self.assertEqual(resp.status_code, 201, resp.content)
        self.agendamento.refresh_from_db()
        return resp

    def _patch(self, usuario, situacao, agendamento=None):
        self.client.force_authenticate(usuario)
        agendamento = agendamento or self.agendamento
        return self.client.patch(f"{URL_AGENDAMENTOS}{agendamento.id}/", {"situacao": situacao}, format="json")

    def _aguardando_retirada(self):
        self._prescrever(True)
        self.assertEqual(self.agendamento.situacao, "AGUARDANDO_RETIRADA")


class PrescricaoComRetiradaTests(RetiradaMedicamentoBaseTest):
    def test_retirada_imediata_encerra_a_consulta_e_encaminha_para_a_farmacia(self):
        self._prescrever(True)

        self.assertEqual(self.agendamento.situacao, "AGUARDANDO_RETIRADA")
        self.assertTrue(self.agendamento.retirar_medicamento)
        self.assertIsNotNone(self.agendamento.data_hora_fim_atendimento)
        self.assertEqual(Receita.objects.count(), 1)

    def test_retirada_posterior_mantem_o_atendimento(self):
        self._prescrever(False)

        self.assertEqual(self.agendamento.situacao, "ATENDIMENTO")
        self.assertFalse(self.agendamento.retirar_medicamento)

    def test_medico_precisa_indicar_a_retirada(self):
        self.client.force_authenticate(self.medico)
        payload = {"agendamento": str(self.agendamento.id), "medicamentos": [self._item(self.dipirona)]}
        resp = self.client.post(URL_RECEITA, payload, format="json")

        self.assertEqual(resp.status_code, 400)
        self.assertIn("retirada_imediata", resp.json())
        self.assertFalse(Receita.objects.exists())

    def test_retirada_imediata_so_durante_o_atendimento(self):
        Agendamento.objects.filter(pk=self.agendamento.pk).update(situacao="FINALIZADO")

        resp = self._criar_receita(retirada_imediata=True)

        self.assertEqual(resp.status_code, 400)
        self.assertFalse(Receita.objects.exists())
        self.agendamento.refresh_from_db()
        self.assertFalse(self.agendamento.retirar_medicamento)

    def test_medico_ainda_registra_o_atendimento_clinico_depois_do_encaminhamento(self):
        self._aguardando_retirada()
        self.client.force_authenticate(self.medico)

        resp = self.client.post(
            URL_ATENDIMENTO,
            {"agendamento": str(self.agendamento.id), "queixa_principal": "Dor de cabeça"},
            format="json",
        )

        self.assertEqual(resp.status_code, 201, resp.content)

    def test_agendamento_nao_aceita_retirar_medicamento_pelo_payload(self):
        self.client.force_authenticate(self.farmaceutico)
        self.client.patch(
            f"{URL_AGENDAMENTOS}{self.agendamento.id}/",
            {"retirar_medicamento": True, "farmaceutico": str(self.farmaceutico.id)},
            format="json",
        )

        self.agendamento.refresh_from_db()
        self.assertFalse(self.agendamento.retirar_medicamento)
        self.assertIsNone(self.agendamento.farmaceutico_id)


class FilaDaFarmaciaTests(RetiradaMedicamentoBaseTest):
    CPFS = iter(["39053344705", "11144477735", "52998224725", "86288366757"])

    def _outro_agendamento(self, unidade=None, retirar=False):
        return Agendamento.objects.bulk_create(
            [
                Agendamento(
                    cidadao=Cidadao.objects.create(nome="Outro Cidadão", cpf=next(self.CPFS)),
                    unidade=unidade or self.unidade,
                    servico=self.agendamento.servico,
                    data=HOJE,
                    horario=time(10, 0),
                    vaga=self._vaga(time(10, 0)) if unidade is None else None,
                    situacao="AGUARDANDO_RETIRADA" if retirar else "ATENDIMENTO",
                    retirar_medicamento=retirar,
                )
            ]
        )[0]

    def test_farmaceutico_ve_somente_quem_vai_retirar_medicamento_na_sua_unidade(self):
        self._aguardando_retirada()
        self._outro_agendamento()
        self._outro_agendamento(unidade=criar_unidade("Posto B"), retirar=True)

        self.client.force_authenticate(self.farmaceutico)
        resp = self.client.get(URL_AGENDAMENTOS)

        self.assertEqual(resp.status_code, 200, resp.content)
        ids = [item["id"] for item in resp.json()["result"]]
        self.assertEqual(ids, [str(self.agendamento.id)])
        self.assertTrue(resp.json()["result"][0]["retirar_medicamento"])

    def test_farmaceutico_chama_e_a_chamada_vai_para_o_painel(self):
        self._aguardando_retirada()

        resp = self._patch(self.farmaceutico, "CHAMANDO_RETIRADA")

        self.assertEqual(resp.status_code, 200, resp.content)
        self.agendamento.refresh_from_db()
        self.assertEqual(self.agendamento.situacao, "CHAMANDO_RETIRADA")
        self.assertEqual(self.agendamento.farmaceutico, self.farmaceutico)
        chamada = ChamadaPainel.objects.get(agendamento=self.agendamento)
        self.assertEqual(chamada.guiche_nome, "Farmácia")
        self.assertEqual(chamada.cidadao_nome, self.cidadao.nome)

    def test_so_o_farmaceutico_chama_a_retirada(self):
        self._aguardando_retirada()

        for usuario in (self.medico, self.enfermeiro):
            self.assertEqual(self._patch(usuario, "CHAMANDO_RETIRADA").status_code, 403)
        self.agendamento.refresh_from_db()
        self.assertEqual(self.agendamento.situacao, "AGUARDANDO_RETIRADA")

    def test_nao_chama_quem_nao_esta_aguardando_retirada(self):
        resp = self._patch(self.farmaceutico, "CHAMANDO_RETIRADA")

        self.assertEqual(resp.status_code, 409)

    def test_retirada_e_indicada_so_pela_receita(self):
        resp = self._patch(self.farmaceutico, "AGUARDANDO_RETIRADA")

        self.assertEqual(resp.status_code, 400)
        self.agendamento.refresh_from_db()
        self.assertEqual(self.agendamento.situacao, "ATENDIMENTO")

    def test_so_quem_chamou_conclui_a_retirada(self):
        self._aguardando_retirada()
        self.assertEqual(self._patch(self.farmaceutico, "CHAMANDO_RETIRADA").status_code, 200)

        self.assertEqual(self._patch(self.outro_farmaceutico, "FINALIZADO").status_code, 409)
        self.assertEqual(self._patch(self.farmaceutico, "FINALIZADO").status_code, 200)
        self.agendamento.refresh_from_db()
        self.assertEqual(self.agendamento.situacao, "FINALIZADO")

    def test_nao_finaliza_sem_ter_sido_chamado(self):
        self._aguardando_retirada()

        self.assertEqual(self._patch(self.farmaceutico, "FINALIZADO").status_code, 409)
        self.assertEqual(self._patch(self.outro_farmaceutico, "FINALIZADO").status_code, 409)

    def test_outro_farmaceutico_nao_assume_retirada_em_chamada(self):
        self._aguardando_retirada()
        self._patch(self.farmaceutico, "CHAMANDO_RETIRADA")

        self.assertEqual(self._patch(self.outro_farmaceutico, "CHAMANDO_RETIRADA").status_code, 409)

    def test_uma_retirada_em_aberto_por_farmaceutico(self):
        self._aguardando_retirada()
        outro = self._outro_agendamento(retirar=True)
        self.assertEqual(self._patch(self.farmaceutico, "CHAMANDO_RETIRADA").status_code, 200)

        self.assertEqual(self._patch(self.farmaceutico, "CHAMANDO_RETIRADA", agendamento=outro).status_code, 409)

    def test_devolver_a_fila_libera_para_outro_farmaceutico(self):
        self._aguardando_retirada()
        self._patch(self.farmaceutico, "CHAMANDO_RETIRADA")

        self.assertEqual(self._patch(self.outro_farmaceutico, "AGUARDANDO_RETIRADA").status_code, 409)
        self.assertEqual(self._patch(self.farmaceutico, "AGUARDANDO_RETIRADA").status_code, 200)
        self.agendamento.refresh_from_db()
        self.assertEqual(self.agendamento.situacao, "AGUARDANDO_RETIRADA")
        self.assertIsNone(self.agendamento.farmaceutico_id)

        cache.clear()  # intervalo mínimo entre chamadas na mesma unidade
        self.assertEqual(self._patch(self.outro_farmaceutico, "CHAMANDO_RETIRADA").status_code, 200)
        self.agendamento.refresh_from_db()
        self.assertEqual(self.agendamento.farmaceutico, self.outro_farmaceutico)

    def test_retirada_esquecida_de_dias_anteriores_vira_finalizada(self):
        self._aguardando_retirada()
        Agendamento.objects.filter(pk=self.agendamento.pk).update(data=HOJE - timedelta(days=1))

        Agendamento.marcar_vencidos_como_ausencia()

        self.agendamento.refresh_from_db()
        self.assertEqual(self.agendamento.situacao, "FINALIZADO")


class DispensacaoPeloFarmaceuticoTests(RetiradaMedicamentoBaseTest):
    def setUp(self):
        super().setUp()
        self.lote = criar_lote(self.dipirona, self.unidade, "L1", 100, 365)
        self._aguardando_retirada()
        self._patch(self.farmaceutico, "CHAMANDO_RETIRADA")
        self.receita = Receita.objects.get(agendamento=self.agendamento)
        self.item = self.receita.medicamentos.get()

    def test_farmaceutico_consulta_a_receita_do_agendamento_e_dispensa(self):
        self.client.force_authenticate(self.farmaceutico)
        resp = self.client.get(URL_RECEITA, {"agendamento": str(self.agendamento.id)})
        self.assertEqual(resp.status_code, 200, resp.content)
        self.assertEqual([r["id"] for r in resp.json()["result"]], [str(self.receita.id)])

        resp = self.client.post(
            URL_DISPENSAR,
            {"unidade": str(self.unidade.id), "receita_item": str(self.item.id)},
            format="json",
        )

        self.assertEqual(resp.status_code, 201, resp.content)
        self.item.refresh_from_db()
        self.lote.refresh_from_db()
        self.assertEqual(self.item.status_dispensacao, "DISPENSADO")
        self.assertEqual(self.lote.quantidade_atual, 90)
        self.assertEqual(MovimentacaoEstoque.objects.get().usuario, self.farmaceutico)

    def test_farmaceutico_nao_acessa_prontuario_clinico_nem_prescreve(self):
        self.client.force_authenticate(self.farmaceutico)

        self.assertEqual(self.client.get(URL_ATENDIMENTO).status_code, 403)
        payload = {
            "agendamento": str(self.agendamento.id),
            "retirada_imediata": False,
            "medicamentos": [self._item(self.dipirona)],
        }
        self.assertEqual(self.client.post(URL_RECEITA, payload, format="json").status_code, 403)

    def test_farmaceutico_nao_cadastra_lote_nem_medicamento(self):
        self.client.force_authenticate(self.farmaceutico)

        self.assertEqual(self.client.get("/api/v1/estoque/saldo/").status_code, 200)
        self.assertEqual(self.client.post("/api/v1/estoque/lote/", {}, format="json").status_code, 403)
        self.assertEqual(self.client.post("/api/v1/medicamento/", {}, format="json").status_code, 403)
