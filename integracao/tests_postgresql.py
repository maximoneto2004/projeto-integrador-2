import threading
from concurrent.futures import ThreadPoolExecutor
from datetime import time, timedelta
from unittest import skipUnless

from django.contrib.auth.hashers import make_password
from django.db import close_old_connections, connection, connections
from django.test import TransactionTestCase, override_settings
from django.utils import timezone

from agendamentos.models import Agendamento, AgendaVaga
from app.models import Bairro
from cidadaos.models import Cidadao
from integracao.models import DesafioAutenticacaoCidadao, SessaoCidadao
from integracao.services import (
    cancelar_agendamento_cidadao,
    criar_agendamento_cidadao,
    iniciar_desafio,
    verificar_desafio,
)
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import UnidadePosto


@skipUnless(connection.vendor == "postgresql", "Requer locking real do PostgreSQL.")
@override_settings(CITIZEN_AUTH_MOCK_ENABLED=True, CITIZEN_AUTH_MOCK_CODE="123456")
class IntegracaoPostgreSQLConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        bairro = Bairro.objects.create(nome="Bairro Concorrência")
        self.unidade = UnidadePosto.objects.create(
            nome="Posto Concorrência",
            logradouro="Rua A",
            numero="1",
            cep="60000-000",
            bairro=bairro,
            telefone="85999999999",
            hora_manha_inicio=time(8),
            hora_manha_fim=time(12),
        )
        classe = ClasseServico.objects.create(nome="Classe Concorrência")
        self.tipo = TipoServico.objects.create(nome="Tipo Concorrência")
        self.servico = Servico.objects.create(
            nome="Serviço Concorrência",
            classe=classe,
            tipo_servico=self.tipo,
        )
        self.cidadao_a = Cidadao.objects.create(
            nome="Pessoa Concorrência A",
            cpf="52998224725",
            telefone="85999990001",
            unidade_origem=self.unidade,
        )
        self.cidadao_b = Cidadao.objects.create(
            nome="Pessoa Concorrência B",
            cpf="11144477735",
            telefone="85999990002",
            unidade_origem=self.unidade,
        )

    def executar_em_paralelo(self, funcoes):
        barreira = threading.Barrier(len(funcoes))

        def executar(funcao):
            close_old_connections()
            try:
                barreira.wait(timeout=10)
                return "ok", funcao()
            except Exception as exc:  # o tipo é validado pela quantidade de sucessos
                return "erro", type(exc).__name__
            finally:
                connections.close_all()

        with ThreadPoolExecutor(max_workers=len(funcoes)) as executor:
            return list(executor.map(executar, funcoes))

    def test_duas_tentativas_na_ultima_vaga_criam_um_agendamento(self):
        vaga = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=self.tipo,
            data=timezone.localdate() + timedelta(days=2),
            horario=time(9),
            vagas=1,
        )
        resultados = self.executar_em_paralelo(
            [
                lambda: criar_agendamento_cidadao(self.cidadao_a, vaga.id, self.servico.id),
                lambda: criar_agendamento_cidadao(self.cidadao_b, vaga.id, self.servico.id),
            ]
        )
        self.assertEqual([estado for estado, _ in resultados].count("ok"), 1)
        vaga.refresh_from_db()
        self.assertEqual(vaga.vagas_ocupadas, 1)
        self.assertEqual(Agendamento.objects.filter(vaga=vaga).count(), 1)

    def test_dois_cancelamentos_liberam_vaga_uma_vez(self):
        vaga = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=self.tipo,
            data=timezone.localdate() + timedelta(days=2),
            horario=time(9),
            vagas=1,
        )
        agendamento = criar_agendamento_cidadao(self.cidadao_a, vaga.id, self.servico.id)
        resultados = self.executar_em_paralelo(
            [
                lambda: cancelar_agendamento_cidadao(self.cidadao_a, agendamento.id),
                lambda: cancelar_agendamento_cidadao(self.cidadao_a, agendamento.id),
            ]
        )
        self.assertEqual([estado for estado, _ in resultados].count("ok"), 1)
        vaga.refresh_from_db()
        agendamento.refresh_from_db()
        self.assertEqual(vaga.vagas_ocupadas, 0)
        self.assertEqual(agendamento.situacao, "CANCELADO_CIDADAO")

    def test_mesmo_challenge_e_consumido_uma_vez(self):
        desafio = DesafioAutenticacaoCidadao.objects.create(
            cidadao=self.cidadao_a,
            telefone="+5585999990001",
            code_hash=make_password("123456"),
            expires_at=timezone.now() + timedelta(minutes=10),
        )
        resultados = self.executar_em_paralelo(
            [
                lambda: verificar_desafio(desafio.id, "123456"),
                lambda: verificar_desafio(desafio.id, "123456"),
            ]
        )
        self.assertEqual([estado for estado, _ in resultados].count("ok"), 1)
        self.assertEqual(SessaoCidadao.objects.filter(cidadao=self.cidadao_a, revoked_at__isnull=True).count(), 1)

    def test_challenges_distintos_deixam_uma_sessao_valida(self):
        desafios = [
            DesafioAutenticacaoCidadao.objects.create(
                cidadao=self.cidadao_a,
                telefone="+5585999990001",
                code_hash=make_password("123456"),
                expires_at=timezone.now() + timedelta(minutes=10),
            )
            for _ in range(2)
        ]
        resultados = self.executar_em_paralelo(
            [lambda: verificar_desafio(desafios[0].id, "123456"), lambda: verificar_desafio(desafios[1].id, "123456")]
        )
        self.assertEqual([estado for estado, _ in resultados].count("ok"), 2)
        self.assertEqual(SessaoCidadao.objects.filter(cidadao=self.cidadao_a, revoked_at__isnull=True).count(), 1)

    def test_criacao_concorrente_de_challenge_deixa_um_ativo(self):
        resultados = self.executar_em_paralelo(
            [
                lambda: iniciar_desafio(self.cidadao_a.cpf, self.cidadao_a.telefone),
                lambda: iniciar_desafio(self.cidadao_a.cpf, self.cidadao_a.telefone),
            ]
        )
        self.assertEqual([estado for estado, _ in resultados].count("ok"), 2)
        self.assertEqual(
            DesafioAutenticacaoCidadao.objects.filter(cidadao=self.cidadao_a, is_active=True).count(),
            1,
        )
