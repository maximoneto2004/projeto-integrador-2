from datetime import time, timedelta

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.utils import timezone

from agendamentos.models import Agendamento, AgendaVaga
from agendamentos.services import cancelar_agendamento, sincronizar_capacidade_vagas
from cidadaos.models import Cidadao
from medicamentos.tests import criar_usuario
from medicamentos.tests_estoque import criar_unidade
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import BloqueioHorario


class AgendamentoRegraBase(TestCase):
    def setUp(self):
        self.unidade = criar_unidade("Posto Agenda")
        self.tipo = TipoServico.objects.create(nome="Consulta agenda")
        self.servico = Servico.objects.create(
            nome="Serviço agenda",
            classe=ClasseServico.objects.create(nome="Classe agenda"),
            tipo_servico=self.tipo,
        )
        self.cidadao = Cidadao.objects.create(nome="Pessoa Agenda", cpf="15350946056")
        self.vaga = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=self.tipo,
            data=timezone.localdate() + timedelta(days=1),
            horario=time(9),
            vagas=2,
        )

    def criar_programado(self, **extra):
        dados = {
            "cidadao": self.cidadao,
            "unidade": self.unidade,
            "servico": self.servico,
            "vaga": self.vaga,
            "origem": "RECEPCAO",
        }
        dados.update(extra)
        return Agendamento.objects.create(**dados)


class CapacidadeAgendamentoTests(AgendamentoRegraBase):
    def test_criacao_programada_incrementa_uma_vez(self):
        self.criar_programado()
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 1)

    def test_fila_sem_vaga_nao_altera_capacidade(self):
        agendamento = Agendamento.objects.create(
            cidadao=self.cidadao, unidade=self.unidade, servico=self.servico,
            data=timezone.localdate(), horario=time(10), situacao="CHAMANDO", origem="FILA",
        )
        self.assertIsNone(agendamento.vaga_id)
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 0)

    def test_cancelamento_libera_uma_vez_e_repeticao_nao_decrementa(self):
        agendamento = self.criar_programado()
        cancelar_agendamento(agendamento.pk, origem="CANCELADO_CIDADAO")
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 0)
        with self.assertRaises(Exception):
            cancelar_agendamento(agendamento.pk, origem="CANCELADO_CIDADAO")
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 0)

    def test_ausencia_e_ausencia_repetida_liberam_uma_vez(self):
        agendamento = self.criar_programado()
        agendamento.situacao = "AUSENCIA_CIDADAO"
        agendamento.save()
        agendamento.save()
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 0)
        self.assertIsNone(agendamento.vaga_id)

    def test_vaga_ja_liberada_nao_fica_negativa(self):
        agendamento = self.criar_programado()
        AgendaVaga.objects.filter(pk=self.vaga.pk).update(vagas_ocupadas=0)
        cancelar_agendamento(agendamento.pk, origem="CANCELADO_CRAS")
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 0)

    def test_job_de_ausencia_libera_vaga(self):
        self.vaga.data = timezone.localdate() - timedelta(days=1)
        self.vaga.save()
        self.criar_programado()
        self.assertEqual(Agendamento.marcar_vencidos_como_ausencia(), 1)
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 0)

    def test_lotacao_nunca_ultrapassa_limite(self):
        self.vaga.vagas = 1
        self.vaga.save()
        self.criar_programado()
        outro = Cidadao.objects.create(nome="Outra Pessoa", cpf="52998224725")
        with self.assertRaises(ValidationError):
            self.criar_programado(cidadao=outro)
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 1)

    def test_bloqueio_e_desbloqueio_preservam_agendamentos_existentes(self):
        self.criar_programado()
        usuario = criar_usuario("bloqueio@teste.local", "11144477735")
        bloqueio = BloqueioHorario.objects.create(
            data=self.vaga.data, hora_inicio=time(8), hora_fim=time(10),
            motivo="Teste", criado_por=usuario,
        )
        bloqueio.unidades.add(self.unidade)
        sincronizar_capacidade_vagas(AgendaVaga.objects.filter(pk=self.vaga.pk))
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 2)

        bloqueio.delete()
        sincronizar_capacidade_vagas(AgendaVaga.objects.filter(pk=self.vaga.pk))
        self.vaga.refresh_from_db()
        self.assertEqual(self.vaga.vagas_ocupadas, 1)


class MaquinaEstadosTests(AgendamentoRegraBase):
    def criar_fila_no_estado(self, situacao):
        return Agendamento.objects.bulk_create([Agendamento(
            cidadao=self.cidadao, unidade=self.unidade, servico=self.servico,
            data=timezone.localdate(), horario=time(11), situacao=situacao, origem="FILA",
        )])[0]

    def test_todas_as_transicoes_declaradas_sao_aceitas(self):
        for origem, destinos in Agendamento.TRANSICOES_PERMITIDAS.items():
            for destino in destinos:
                with self.subTest(origem=origem, destino=destino):
                    agendamento = self.criar_fila_no_estado(origem)
                    agendamento.situacao = destino
                    agendamento.save()
                    self.assertEqual(agendamento.situacao, destino)
                    agendamento.delete()

    def test_transicoes_impossiveis_e_reabertura_sao_rejeitadas(self):
        for origem, destino in [
            ("AGENDADO", "FINALIZADO"), ("FINALIZADO", "ATENDIMENTO"),
            ("CANCELADO_CRAS", "CHAMANDO"), ("ATIVADO_AUSENTE", "ATENDIMENTO"),
        ]:
            with self.subTest(origem=origem, destino=destino):
                agendamento = self.criar_fila_no_estado(origem)
                agendamento.situacao = destino
                with self.assertRaises(ValidationError):
                    agendamento.save()
                agendamento.delete()
