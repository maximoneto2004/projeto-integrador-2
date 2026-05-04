from datetime import date, datetime, timedelta

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from app.models import Bairro
from agendamentos.models import AgendaVaga, Agendamento
from cidadaos.models import Cidadao
from prontuario.models import (
    AcolhimentoFamiliar,
    AnotacaoPlanejamento,
    BeneficiosEventuais,
    BeneficioSocial,
    DescumprimentoCondicionalidadesBolsa,
    MembroComposicao,
    NovoIngresso,
    PessoaReferencia,
    Prontuario,
    RegistroDesligamento,
    SaudeCuidadosMembro,
    SituacaoViolencia,
    TrabalhoRendimento,
    TransferenciaRenda,
)
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_cras.models import UnidadeCras

from .models import (
    ConfiguracaoRelatorioAtendimentosTecnico,
    ConfiguracaoRelatorioAtividadesCadunico,
)


class RelatorioAtendimentosTecnicoAPITestCase(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="teste@example.com",
            username="teste@example.com",
            nome_completo="Usuario Teste",
            cpf="39053344705",
            telefone="85999999999",
            password="Senha@123",
        )
        view_permission = Permission.objects.get(codename="view_prontuario")
        self.user.user_permissions.add(view_permission)
        self.client.force_authenticate(self.user)

        bairro = Bairro.objects.create(nome="Centro")
        unidade = UnidadeCras.objects.create(
            nome="CRAS Centro",
            logradouro="Rua A",
            numero="100",
            cep="60000-000",
            bairro=bairro,
            telefone="8533333333",
            email="cras@example.com",
        )
        self.unidade = unidade
        self.outra_unidade = UnidadeCras.objects.create(
            nome="CRAS Bairro",
            logradouro="Rua B",
            numero="200",
            cep="60000-001",
            bairro=bairro,
            telefone="8544444444",
            email="cras-bairro@example.com",
        )

        self.prontuario_ativo = Prontuario.objects.create(unidade_inicial=unidade)
        self.prontuario_desligado = Prontuario.objects.create(unidade_inicial=unidade)
        self.prontuario_sem_ingresso = Prontuario.objects.create(unidade_inicial=unidade)
        self.prontuario_mes_atual = Prontuario.objects.create(unidade_inicial=unidade)

        hoje = timezone.localdate()

        NovoIngresso.objects.create(
            prontuario=self.prontuario_ativo,
            data_ingresso=date(2026, 1, 10),
            motivo="Demanda espontanea",
        )
        NovoIngresso.objects.create(
            prontuario=self.prontuario_desligado,
            data_ingresso=date(2026, 1, 12),
            motivo="Encaminhamento",
        )
        RegistroDesligamento.objects.create(
            prontuario=self.prontuario_desligado,
            data_desligamento=date(2026, 2, 10),
            motivo="METAS",
        )
        NovoIngresso.objects.create(
            prontuario=self.prontuario_mes_atual,
            data_ingresso=date(hoje.year, hoje.month, 5),
            motivo="Busca ativa",
        )
        self._criar_agendamentos()
        self._criar_dados_renda_extrema_pobreza(unidade)
        self._criar_beneficios_eventuais()

    def _criar_agendamentos(self):
        classe_servico = ClasseServico.objects.create(nome="Atendimento")
        tipo_servico = TipoServico.objects.create(nome="ESPECIALIZADO")
        servico = Servico.objects.create(
            nome="Servico Tecnico",
            classe=classe_servico,
            tipo_servico=tipo_servico,
        )
        servico_cadastro_unico = Servico.objects.create(
            nome="Inclusão de nova família no Cadastro Único (1° vez)",
            classe=classe_servico,
            tipo_servico=tipo_servico,
        )
        servico_encaminhamento_cadunico = Servico.objects.create(
            nome="Encaminhamento para Inclusão de nova família no Cadastro Único (1° vez)",
            classe=classe_servico,
            tipo_servico=tipo_servico,
        )
        servico_atualizacao_cadunico = Servico.objects.create(
            nome="Encaminhamento para atualização cadastral no Cadastro Único",
            classe=classe_servico,
            tipo_servico=tipo_servico,
        )
        servico_acesso_bpc = Servico.objects.create(
            nome="Encaminhar: Acesso ao BPC ",
            classe=classe_servico,
            tipo_servico=tipo_servico,
        )
        servico_acompanhamento_particularizado = Servico.objects.create(
            nome="Acompanhamento Particularizado (visita domiciliar)",
            classe=classe_servico,
            tipo_servico=tipo_servico,
        )
        servico_encaminhamento_creas = Servico.objects.create(
            nome="Encaminhar: Para o CREAS",
            classe=classe_servico,
            tipo_servico=tipo_servico,
        )
        vaga_janeiro = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=tipo_servico,
            data=date(2026, 1, 10),
            horario="08:00",
            vagas=2,
        )
        vaga_fevereiro = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=tipo_servico,
            data=date(2026, 2, 10),
            horario="09:00",
            vagas=2,
        )
        vaga_janeiro_cadunico = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=tipo_servico,
            data=date(2026, 1, 15),
            horario="10:00",
            vagas=1,
        )
        cidadao_agendamento_1 = self._criar_cidadao(100)
        cidadao_agendamento_2 = self._criar_cidadao(101)
        cidadao_agendamento_3 = self._criar_cidadao(102)
        agendamento_janeiro = Agendamento.objects.create(
            cidadao=cidadao_agendamento_1,
            unidade=self.unidade,
            servico=servico,
            vaga=vaga_janeiro,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )
        agendamento_janeiro.servicos_adicionais.add(servico_encaminhamento_creas)
        agendamento_cadunico = Agendamento.objects.create(
            cidadao=cidadao_agendamento_3,
            unidade=self.unidade,
            servico=servico_cadastro_unico,
            vaga=vaga_janeiro_cadunico,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )
        agendamento_cadunico.servicos_adicionais.add(servico_encaminhamento_cadunico)
        agendamento_cadunico.servicos_adicionais.add(servico_atualizacao_cadunico)
        agendamento_cadunico.servicos_adicionais.add(servico_acesso_bpc)
        agendamento_cadunico.servicos_adicionais.add(
            servico_acompanhamento_particularizado
        )
        Agendamento.objects.create(
            cidadao=cidadao_agendamento_2,
            unidade=self.unidade,
            servico=servico,
            vaga=vaga_fevereiro,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )

    def _criar_cidadao(self, indice, data_nascimento=None):
        return Cidadao.objects.create(
            nome=f"Pessoa {indice}",
            cpf=f"{indice:011d}",
            data_nascimento=data_nascimento or date(1990, 1, 1),
            telefone="85999999999",
        )

    def _criar_dados_renda_extrema_pobreza(self, unidade):
        cidadao_1 = self._criar_cidadao(1)
        cidadao_2 = self._criar_cidadao(2, data_nascimento=date(2010, 1, 1))
        membro_1 = MembroComposicao.objects.create(
            prontuario=self.prontuario_ativo,
            cidadao=cidadao_1,
            ativo=True,
        )
        membro_2 = MembroComposicao.objects.create(
            prontuario=self.prontuario_ativo,
            cidadao=cidadao_2,
            ativo=True,
        )
        trabalho_ativo = TrabalhoRendimento.objects.create(
            prontuario=self.prontuario_ativo,
            renda_total=100,
        )
        bolsa_familia = BeneficioSocial.objects.create(nome="Bolsa Família")
        transferencia_bolsa = TransferenciaRenda.objects.create(
            prontuario=self.prontuario_ativo,
            beneficio=bolsa_familia,
            valor=500,
        )
        trabalho_ativo.transferencia_renda_familia.add(transferencia_bolsa)
        pessoa_referencia_ativo = PessoaReferencia.objects.create(
            prontuario=self.prontuario_ativo,
            pessoa_referencia=cidadao_1,
        )
        pessoa_referencia_ativo.beneficio.add(bolsa_familia)
        DescumprimentoCondicionalidadesBolsa.objects.create(
            prontuario=self.prontuario_ativo,
            membro=membro_1,
            efeito_codigo="BLOQUEIO",
        )
        SituacaoViolencia.objects.create(
            prontuario=self.prontuario_ativo,
            trabalho_infantil="SIM",
        )
        AcolhimentoFamiliar.objects.create(
            prontuario=self.prontuario_ativo,
            membro=membro_2,
            data_entrada=date(2026, 1, 15),
            motivo="Acolhimento temporario",
        )

        self.prontuario_nao_extrema = Prontuario.objects.create(unidade_inicial=unidade)
        NovoIngresso.objects.create(
            prontuario=self.prontuario_nao_extrema,
            data_ingresso=date(2026, 1, 20),
            motivo="Demanda espontanea",
        )
        cidadao_3 = self._criar_cidadao(3)
        cidadao_4 = self._criar_cidadao(4)
        membro_3 = MembroComposicao.objects.create(
            prontuario=self.prontuario_nao_extrema,
            cidadao=cidadao_3,
            ativo=True,
        )
        MembroComposicao.objects.create(
            prontuario=self.prontuario_nao_extrema,
            cidadao=cidadao_4,
            ativo=True,
        )
        trabalho_nao_extrema = TrabalhoRendimento.objects.create(
            prontuario=self.prontuario_nao_extrema,
            renda_total=100,
        )
        bpc = BeneficioSocial.objects.create(nome="BPC")
        transferencia_bpc = TransferenciaRenda.objects.create(
            prontuario=self.prontuario_nao_extrema,
            beneficio=bpc,
            valor=200,
        )
        trabalho_nao_extrema.transferencia_renda_familia.add(transferencia_bpc)
        pessoa_referencia_nao_extrema = PessoaReferencia.objects.create(
            prontuario=self.prontuario_nao_extrema,
            pessoa_referencia=cidadao_3,
        )
        pessoa_referencia_nao_extrema.beneficio.add(bpc)
        AcolhimentoFamiliar.objects.create(
            prontuario=self.prontuario_nao_extrema,
            membro=membro_3,
            data_entrada=date(2026, 1, 18),
            motivo="Acolhimento de adulto",
        )

    def _criar_beneficios_eventuais(self):
        BeneficiosEventuais.objects.create(
            prontuario=self.prontuario_ativo,
            beneficio="NATALIDADE",
            data_beneficio=date(2026, 1, 12),
            observacao="Auxilio natalidade janeiro",
        )

        BeneficiosEventuais.objects.create(
            prontuario=self.prontuario_mes_atual,
            beneficio="NATALIDADE",
            data_beneficio=timezone.localdate().replace(day=6),
            observacao="Auxilio natalidade mes atual",
        )

        BeneficiosEventuais.objects.create(
            prontuario=self.prontuario_ativo,
            beneficio="FUNERAL",
            data_beneficio=date(2026, 1, 14),
            observacao="Auxilio funeral janeiro",
        )
        BeneficiosEventuais.objects.create(
            prontuario=self.prontuario_ativo,
            beneficio="BASICA",
            data_beneficio=date(2026, 1, 16),
            observacao="Cesta basica janeiro",
        )

    def test_deve_retornar_quantidade_de_familias_em_acompanhamento(self):
        response = self.client.get(reverse("relatorio-atendimentos-tecnico"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["success"], True)
        self.assertEqual(response.data["result"]["familias_em_acompanhamento"], 3)
        self.assertEqual(
            response.data["result"][
                "familias_que_iniciaram_acompanhamento_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_em_extrema_pobreza_no_mes_referencia"],
            0,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_bolsa_familia_no_mes_referencia"],
            0,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_bpc_no_mes_referencia"],
            0,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_descumprimento_condicionalidades_no_mes_referencia"],
            0,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_trabalho_infantil_no_mes_referencia"],
            0,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_acolhimento_familiar_no_mes_referencia"],
            0,
        )
        self.assertEqual(
            response.data["result"]["atendimentos_realizados_no_mes_referencia"],
            0,
        )
        self.assertEqual(
            response.data["result"]["auxilios_natalidade_concedidos_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["auxilios_funeral_concedidos_no_mes_referencia"],
            0,
        )
        self.assertEqual(
            response.data["result"][
                "outros_beneficios_eventuais_concedidos_no_mes_referencia"
            ],
            0,
        )
        self.assertEqual(
            response.data["result"][
                "agendamentos_com_encaminhamento_creas_no_mes_referencia"
            ],
            0,
        )
        self.assertEqual(
            response.data["result"][
                "atendimentos_com_encaminhamento_cadastro_unico_no_mes_referencia"
            ],
            0,
        )
        self.assertEqual(
            response.data["result"][
                "atendimentos_com_atualizacao_cadastro_unico_no_mes_referencia"
            ],
            0,
        )
        self.assertEqual(
            response.data["result"]["atendimentos_com_acesso_bpc_no_mes_referencia"],
            0,
        )
        self.assertEqual(
            response.data["result"][
                "atendimentos_com_acompanhamento_particularizado_no_mes_referencia"
            ],
            0,
        )
        self.assertEqual(response.data["result"]["mes_referencia"], timezone.localdate().month)
        self.assertEqual(response.data["result"]["ano_referencia"], timezone.localdate().year)

    def test_deve_considerar_reingresso_sem_desligamento_posterior_como_acompanhamento(self):
        prontuario_reingresso = Prontuario.objects.create(unidade_inicial=self.unidade)
        NovoIngresso.objects.create(
            prontuario=prontuario_reingresso,
            data_ingresso=date(2026, 1, 5),
            motivo="Busca ativa",
        )
        RegistroDesligamento.objects.create(
            prontuario=prontuario_reingresso,
            data_desligamento=date(2026, 1, 20),
            motivo="METAS",
        )
        NovoIngresso.objects.create(
            prontuario=prontuario_reingresso,
            data_ingresso=date(2026, 3, 1),
            motivo="Retorno ao acompanhamento",
        )

        response = self.client.get(reverse("relatorio-atendimentos-tecnico"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["familias_em_acompanhamento"], 4)

    def test_deve_retornar_contagem_por_servico_adicional_selecionado(self):
        servico_creas = Servico.objects.get(nome="Encaminhar: Para o CREAS")
        servico_bpc = Servico.objects.get(nome="Encaminhar: Acesso ao BPC ")

        response = self.client.get(
            reverse("relatorio-atendimentos-tecnico"),
            {
                "mes_referencia": 1,
                "ano_referencia": 2026,
                "servicos_adicionais": f"{servico_creas.id},{servico_bpc.id}",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["result"]["servicos_adicionais_selecionados_no_mes_referencia"],
            {
                str(servico_creas.id): {"nome": servico_creas.nome, "total": 1},
                str(servico_bpc.id): {"nome": servico_bpc.nome, "total": 1},
            },
        )

    def test_deve_usar_configuracao_ativa_do_admin_quando_ids_nao_forem_informados(self):
        servico_creas = Servico.objects.get(nome="Encaminhar: Para o CREAS")
        servico_bpc = Servico.objects.get(nome="Encaminhar: Acesso ao BPC ")
        servico_grupo = Servico.objects.get(nome="Servico Tecnico")
        servico_particularizado = Servico.objects.get(
            nome="Acompanhamento Particularizado (visita domiciliar)"
        )
        configuracao = ConfiguracaoRelatorioAtendimentosTecnico.objects.create(
            nome="Padrao",
        )
        configuracao.servicos_adicionais.add(servico_creas, servico_bpc)
        configuracao.servicos_adicionais_agrupados.add(servico_creas, servico_bpc)
        configuracao.servicos_adicionais_pcd.add(servico_particularizado, servico_creas)
        configuracao.familias_grupos = servico_grupo
        configuracao.servico_adicional_faixa_etaria = servico_particularizado
        configuracao.save(
            update_fields=[
                "familias_grupos",
                "servico_adicional_faixa_etaria",
                "updated_at",
            ]
        )

        cidadao_agendado = Cidadao.objects.get(cpf=f"{102:011d}")
        membro_pcd = MembroComposicao.objects.create(
            prontuario=self.prontuario_ativo,
            cidadao=cidadao_agendado,
            ativo=True,
        )
        SaudeCuidadosMembro.objects.create(
            prontuario=self.prontuario_ativo,
            membro=membro_pcd,
            deficiencia="SIM",
        )

        tipo_servico = TipoServico.objects.get(nome="ESPECIALIZADO")
        servico = Servico.objects.get(nome="Servico Tecnico")
        vaga_faixas = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=tipo_servico,
            data=date(2026, 1, 20),
            horario="11:00",
            vagas=10,
        )
        for indice, nascimento in [
            (201, date(2022, 1, 20)),
            (202, date(2016, 1, 20)),
            (203, date(2010, 1, 20)),
            (204, date(1960, 1, 20)),
        ]:
            agendamento = Agendamento.objects.create(
                cidadao=self._criar_cidadao(indice, data_nascimento=nascimento),
                unidade=self.unidade,
                servico=servico,
                vaga=vaga_faixas,
                situacao="FINALIZADO",
                final_atendimento="REALIZADO",
                origem="RECEPCAO",
            )
            agendamento.servicos_adicionais.add(servico_particularizado)

        prontuario_grupo = Prontuario.objects.create(unidade_inicial=self.unidade)
        for indice in [205, 206]:
            cidadao = self._criar_cidadao(indice)
            MembroComposicao.objects.create(
                prontuario=prontuario_grupo,
                cidadao=cidadao,
                ativo=True,
            )
            Agendamento.objects.create(
                cidadao=cidadao,
                unidade=self.unidade,
                servico=servico_grupo,
                vaga=vaga_faixas,
                situacao="FINALIZADO",
                final_atendimento="REALIZADO",
                origem="RECEPCAO",
            )

        response = self.client.get(
            reverse("relatorio-atendimentos-tecnico"),
            {"mes_referencia": 1, "ano_referencia": 2026},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["result"]["servicos_adicionais_selecionados_no_mes_referencia"],
            {
                str(servico_creas.id): {"nome": servico_creas.nome, "total": 1},
                str(servico_bpc.id): {"nome": servico_bpc.nome, "total": 1},
            },
        )
        self.assertEqual(
            response.data["result"]["servicos_adicionais_agrupados_no_mes_referencia"],
            {
                "servicos": [
                    {"id": str(servico_creas.id), "nome": servico_creas.nome},
                    {"id": str(servico_bpc.id), "nome": servico_bpc.nome},
                ],
                "total": 2,
            },
        )
        self.assertEqual(
            response.data["result"]["servicos_adicionais_pcd_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["familias_grupos_no_mes_referencia"],
            {
                "servico_id": str(servico_grupo.id),
                "servico_nome": servico_grupo.nome,
                "total": 1,
            },
        )
        self.assertEqual(
            response.data["result"]["faixas_etarias_servico_adicional_no_mes_referencia"],
            {
                "servico_id": str(servico_particularizado.id),
                "servico_nome": servico_particularizado.nome,
                "criancas_0_a_6_anos": 1,
                "criancas_adolescentes_7_a_14_anos": 1,
                "adolescentes_15_a_17_anos": 1,
                "adultos_18_a_59_anos": 1,
                "idosos": 1,
            },
        )

    def test_deve_retornar_total_distinto_de_familias_participando_de_grupos(self):
        tipo_servico = TipoServico.objects.get(nome="ESPECIALIZADO")
        servico_grupo = Servico.objects.get(nome="Servico Tecnico")
        vaga_grupo = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=tipo_servico,
            data=date(2026, 1, 25),
            horario="13:00",
            vagas=10,
        )

        prontuario_1 = Prontuario.objects.create(unidade_inicial=self.unidade)
        prontuario_2 = Prontuario.objects.create(unidade_inicial=self.unidade)

        for prontuario, indice in [
            (prontuario_1, 301),
            (prontuario_1, 302),
            (prontuario_2, 303),
        ]:
            cidadao = self._criar_cidadao(indice)
            MembroComposicao.objects.create(
                prontuario=prontuario,
                cidadao=cidadao,
                ativo=True,
            )
            Agendamento.objects.create(
                cidadao=cidadao,
                unidade=self.unidade,
                servico=servico_grupo,
                vaga=vaga_grupo,
                situacao="FINALIZADO",
                final_atendimento="REALIZADO",
                origem="RECEPCAO",
            )

        response = self.client.get(
            reverse("relatorio-atendimentos-tecnico"),
            {
                "mes_referencia": 1,
                "ano_referencia": 2026,
                "familias_grupos": str(servico_grupo.id),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["result"]["familias_grupos_no_mes_referencia"],
            {
                "servico_id": str(servico_grupo.id),
                "servico_nome": servico_grupo.nome,
                "total": 2,
            },
        )

    def test_deve_retornar_faixas_etarias_por_servico_adicional_selecionado(self):
        tipo_servico = TipoServico.objects.get(nome="ESPECIALIZADO")
        servico = Servico.objects.get(nome="Servico Tecnico")
        servico_particularizado = Servico.objects.get(
            nome="Acompanhamento Particularizado (visita domiciliar)"
        )
        vaga_faixas = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=tipo_servico,
            data=date(2026, 1, 20),
            horario="11:00",
            vagas=10,
        )

        for indice, nascimento in [
            (201, date(2022, 1, 20)),
            (202, date(2016, 1, 20)),
            (203, date(2010, 1, 20)),
            (204, date(1960, 1, 20)),
        ]:
            agendamento = Agendamento.objects.create(
                cidadao=self._criar_cidadao(indice, data_nascimento=nascimento),
                unidade=self.unidade,
                servico=servico,
                vaga=vaga_faixas,
                situacao="FINALIZADO",
                final_atendimento="REALIZADO",
                origem="RECEPCAO",
            )
            agendamento.servicos_adicionais.add(servico_particularizado)

        response = self.client.get(
            reverse("relatorio-atendimentos-tecnico"),
            {
                "mes_referencia": 1,
                "ano_referencia": 2026,
                "servico_adicional_faixa_etaria": str(servico_particularizado.id),
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["result"]["faixas_etarias_servico_adicional_no_mes_referencia"],
            {
                "servico_id": str(servico_particularizado.id),
                "servico_nome": servico_particularizado.nome,
                "criancas_0_a_6_anos": 1,
                "criancas_adolescentes_7_a_14_anos": 1,
                "adolescentes_15_a_17_anos": 1,
                "adultos_18_a_59_anos": 1,
                "idosos": 1,
            },
        )

    def test_deve_retornar_soma_de_servicos_adicionais_agrupados(self):
        servico_creas = Servico.objects.get(nome="Encaminhar: Para o CREAS")
        servico_bpc = Servico.objects.get(nome="Encaminhar: Acesso ao BPC ")

        response = self.client.get(
            reverse("relatorio-atendimentos-tecnico"),
            {
                "mes_referencia": 1,
                "ano_referencia": 2026,
                "servicos_adicionais_agrupados": f"{servico_creas.id},{servico_bpc.id}",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["result"]["servicos_adicionais_agrupados_no_mes_referencia"],
            {
                "servicos": [
                    {"id": str(servico_creas.id), "nome": servico_creas.nome},
                    {"id": str(servico_bpc.id), "nome": servico_bpc.nome},
                ],
                "total": 2,
            },
        )

    def test_deve_retornar_contagem_por_servico_adicional_para_pessoa_com_deficiencia(self):
        servico_particularizado = Servico.objects.get(
            nome="Acompanhamento Particularizado (visita domiciliar)"
        )
        servico_creas = Servico.objects.get(nome="Encaminhar: Para o CREAS")
        cidadao_agendado = Cidadao.objects.get(cpf=f"{102:011d}")
        membro_pcd = MembroComposicao.objects.create(
            prontuario=self.prontuario_ativo,
            cidadao=cidadao_agendado,
            ativo=True,
        )
        SaudeCuidadosMembro.objects.create(
            prontuario=self.prontuario_ativo,
            membro=membro_pcd,
            deficiencia="SIM",
        )

        response = self.client.get(
            reverse("relatorio-atendimentos-tecnico"),
            {
                "mes_referencia": 1,
                "ano_referencia": 2026,
                "servicos_adicionais_pcd": f"{servico_particularizado.id},{servico_creas.id}",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["result"]["servicos_adicionais_pcd_no_mes_referencia"],
            1,
        )

    def test_deve_filtrar_mes_e_ano_de_referencia(self):
        response = self.client.get(
            reverse("relatorio-atendimentos-tecnico"),
            {"mes_referencia": 1, "ano_referencia": 2026},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["result"][
                "familias_que_iniciaram_acompanhamento_no_mes_referencia"
            ],
            3,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_em_extrema_pobreza_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_bolsa_familia_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_bpc_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_descumprimento_condicionalidades_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_trabalho_infantil_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["familias_novas_com_acolhimento_familiar_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["atendimentos_realizados_no_mes_referencia"],
            2,
        )
        self.assertEqual(
            response.data["result"]["auxilios_natalidade_concedidos_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["auxilios_funeral_concedidos_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "outros_beneficios_eventuais_concedidos_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "agendamentos_com_encaminhamento_creas_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "atendimentos_com_encaminhamento_cadastro_unico_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "atendimentos_com_atualizacao_cadastro_unico_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"]["atendimentos_com_acesso_bpc_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "atendimentos_com_acompanhamento_particularizado_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(response.data["result"]["mes_referencia"], 1)
        self.assertEqual(response.data["result"]["ano_referencia"], 2026)

    def test_deve_filtrar_por_unidade_cras(self):
        prontuario_outra_unidade = Prontuario.objects.create(
            unidade_inicial=self.outra_unidade
        )
        NovoIngresso.objects.create(
            prontuario=prontuario_outra_unidade,
            data_ingresso=date(2026, 1, 22),
            motivo="Busca ativa",
        )

        classe_servico = ClasseServico.objects.create(nome="Atendimento Outra Unidade")
        tipo_servico = TipoServico.objects.get(nome="ESPECIALIZADO")
        servico = Servico.objects.create(
            nome="Servico Tecnico Outra Unidade",
            classe=classe_servico,
            tipo_servico=tipo_servico,
        )
        servico_encaminhamento_creas = Servico.objects.get(
            nome="Encaminhar: Para o CREAS"
        )
        servico_acesso_bpc = Servico.objects.get(
            nome="Encaminhar: Acesso ao BPC "
        )
        servico_acompanhamento_particularizado = Servico.objects.get(
            nome="Acompanhamento Particularizado (visita domiciliar)"
        )
        servico_atualizacao_cadunico = Servico.objects.get(
            nome="Encaminhamento para atualização cadastral no Cadastro Único"
        )
        vaga = AgendaVaga.objects.create(
            unidade=self.outra_unidade,
            tipo_servico=tipo_servico,
            data=date(2026, 1, 22),
            horario="10:00",
            vagas=1,
        )
        agendamento_outra_unidade = Agendamento.objects.create(
            cidadao=self._criar_cidadao(103),
            unidade=self.outra_unidade,
            servico=servico,
            vaga=vaga,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )
        agendamento_outra_unidade.servicos_adicionais.add(servico_encaminhamento_creas)
        agendamento_outra_unidade.servicos_adicionais.add(servico_acesso_bpc)
        agendamento_outra_unidade.servicos_adicionais.add(
            servico_acompanhamento_particularizado
        )
        agendamento_outra_unidade.servicos_adicionais.add(servico_atualizacao_cadunico)
        BeneficiosEventuais.objects.create(
            prontuario=prontuario_outra_unidade,
            beneficio="NATALIDADE",
            data_beneficio=date(2026, 1, 22),
            observacao="Auxilio natalidade outra unidade",
        )
        BeneficiosEventuais.objects.create(
            prontuario=prontuario_outra_unidade,
            beneficio="FUNERAL",
            data_beneficio=date(2026, 1, 23),
            observacao="Auxilio funeral outra unidade",
        )
        BeneficiosEventuais.objects.create(
            prontuario=prontuario_outra_unidade,
            beneficio="ALUGUEL",
            data_beneficio=date(2026, 1, 24),
            observacao="Aluguel social outra unidade",
        )

        response = self.client.get(
            reverse("relatorio-atendimentos-tecnico"),
            {
                "mes_referencia": 1,
                "ano_referencia": 2026,
                "unidade_cras": self.unidade.id,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["result"][
                "familias_que_iniciaram_acompanhamento_no_mes_referencia"
            ],
            3,
        )
        self.assertEqual(
            response.data["result"]["atendimentos_realizados_no_mes_referencia"],
            2,
        )
        self.assertEqual(
            response.data["result"]["auxilios_natalidade_concedidos_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"]["auxilios_funeral_concedidos_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "outros_beneficios_eventuais_concedidos_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "agendamentos_com_encaminhamento_creas_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "atendimentos_com_encaminhamento_cadastro_unico_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "atendimentos_com_atualizacao_cadastro_unico_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"]["atendimentos_com_acesso_bpc_no_mes_referencia"],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "atendimentos_com_acompanhamento_particularizado_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(response.data["result"]["unidade_cras"], str(self.unidade.id))


class RelatorioAtividadesCadunicoAPITestCase(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="cadunico@example.com",
            username="cadunico@example.com",
            nome_completo="Usuario Cadunico",
            cpf="39053344706",
            telefone="85999999998",
            password="Senha@123",
        )
        view_permission = Permission.objects.get(codename="view_prontuario")
        self.user.user_permissions.add(view_permission)
        self.client.force_authenticate(self.user)

        bairro = Bairro.objects.create(nome="Centro Cadunico")
        self.unidade = UnidadeCras.objects.create(
            nome="CRAS Cadunico",
            logradouro="Rua C",
            numero="300",
            cep="60000-002",
            bairro=bairro,
            telefone="8555555555",
            email="cadunico@example.com",
        )
        self.outra_unidade = UnidadeCras.objects.create(
            nome="CRAS Outra",
            logradouro="Rua D",
            numero="400",
            cep="60000-003",
            bairro=bairro,
            telefone="8566666666",
            email="outra@example.com",
        )

        classe_servico = ClasseServico.objects.create(nome="Atendimento Cadunico")
        self.tipo_comum = TipoServico.objects.create(nome="COMUM")
        self.tipo_especializado = TipoServico.objects.create(nome="ESPECIALIZADO CAD")
        self.servico_comum = Servico.objects.create(
            nome="Servico Cadunico Comum",
            classe=classe_servico,
            tipo_servico=self.tipo_comum,
        )
        self.servico_especializado = Servico.objects.create(
            nome="Servico Cadunico Especializado",
            classe=classe_servico,
            tipo_servico=self.tipo_especializado,
        )
        self.servico_bolsa_familia = Servico.objects.create(
            nome="Serviço Bolsa Família",
            classe=classe_servico,
            tipo_servico=self.tipo_comum,
        )

        vaga_comum_janeiro = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=self.tipo_comum,
            data=date(2026, 1, 10),
            horario="08:00",
            vagas=3,
        )
        vaga_comum_outra_unidade = AgendaVaga.objects.create(
            unidade=self.outra_unidade,
            tipo_servico=self.tipo_comum,
            data=date(2026, 1, 12),
            horario="09:00",
            vagas=2,
        )
        vaga_especializado = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=self.tipo_especializado,
            data=date(2026, 1, 15),
            horario="10:00",
            vagas=1,
        )
        vaga_comum_fevereiro = AgendaVaga.objects.create(
            unidade=self.unidade,
            tipo_servico=self.tipo_comum,
            data=date(2026, 2, 5),
            horario="08:30",
            vagas=2,
        )

        Agendamento.objects.create(
            cidadao=self._criar_cidadao(301),
            unidade=self.unidade,
            servico=self.servico_comum,
            vaga=vaga_comum_janeiro,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )
        Agendamento.objects.create(
            cidadao=self._criar_cidadao(302),
            unidade=self.unidade,
            servico=self.servico_comum,
            vaga=vaga_comum_janeiro,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )
        Agendamento.objects.create(
            cidadao=self._criar_cidadao(303),
            unidade=self.outra_unidade,
            servico=self.servico_comum,
            vaga=vaga_comum_outra_unidade,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )
        Agendamento.objects.create(
            cidadao=self._criar_cidadao(304),
            unidade=self.unidade,
            servico=self.servico_especializado,
            vaga=vaga_especializado,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )
        Agendamento.objects.create(
            cidadao=self._criar_cidadao(305),
            unidade=self.unidade,
            servico=self.servico_bolsa_familia,
            vaga=vaga_comum_janeiro,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )
        Agendamento.objects.create(
            cidadao=self._criar_cidadao(306),
            unidade=self.unidade,
            servico=self.servico_comum,
            vaga=vaga_comum_fevereiro,
            situacao="FINALIZADO",
            final_atendimento="REALIZADO",
            origem="RECEPCAO",
        )

    def _criar_cidadao(self, indice):
        return Cidadao.objects.create(
            nome=f"Pessoa Cadunico {indice}",
            cpf=f"{indice:011d}",
            data_nascimento=date(1990, 1, 1),
            telefone="85999999999",
        )

    def test_deve_retornar_atendimentos_realizados_tipo_comum(self):
        response = self.client.get(
            reverse("relatorio-atividades-cadunico"),
            {"ano_referencia": 2026},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["success"], True)
        self.assertEqual(response.data["result"]["grupos_servicos"], {})
        self.assertEqual(response.data["result"]["ano_referencia"], 2026)

    def test_deve_filtrar_atendimentos_realizados_tipo_comum_por_unidade(self):
        response = self.client.get(
            reverse("relatorio-atividades-cadunico"),
            {
                "ano_referencia": 2026,
                "unidade_cras": self.unidade.id,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["grupos_servicos"], {})
        self.assertEqual(response.data["result"]["unidade_cras"], str(self.unidade.id))

    def test_deve_retornar_linhas_dos_grupos_configurados(self):
        configuracao = ConfiguracaoRelatorioAtividadesCadunico.objects.create(
            nome="Cadunico Padrao",
        )
        configuracao.cadastro_unico.add(
            self.servico_comum, self.servico_especializado
        )
        configuracao.bolsa_familia.add(self.servico_bolsa_familia)

        response = self.client.get(
            reverse("relatorio-atividades-cadunico"),
            {"ano_referencia": 2026},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["result"]["grupos_servicos"],
            {
                "cadastro_unico": {
                    "indicador": "Atendimentos realizados - Cadastro Único",
                    "servicos": [
                        {
                            "id": None,
                            "nome": "Atendimentos realizados - tipo COMUM",
                            "valores": {
                                "indicador": "Atendimentos realizados - tipo COMUM",
                                "meses": {
                                    "mes_1": {
                                        "dias": {
                                            "dia_10": 3,
                                            "dia_12": 1,
                                        },
                                        "total_mes": 4,
                                    },
                                    "mes_2": {
                                        "dias": {
                                            "dia_5": 1,
                                        },
                                        "total_mes": 1,
                                    },
                                },
                                "total_ano": 5,
                            },
                        },
                        {
                            "id": str(self.servico_comum.id),
                            "nome": self.servico_comum.nome,
                            "valores": {
                                "indicador": self.servico_comum.nome,
                                "meses": {
                                    "mes_1": {
                                        "dias": {
                                            "dia_10": 2,
                                            "dia_12": 1,
                                        },
                                        "total_mes": 3,
                                    },
                                    "mes_2": {
                                        "dias": {
                                            "dia_5": 1,
                                        },
                                        "total_mes": 1,
                                    },
                                },
                                "total_ano": 4,
                            },
                        },
                        {
                            "id": str(self.servico_especializado.id),
                            "nome": self.servico_especializado.nome,
                            "valores": {
                                "indicador": self.servico_especializado.nome,
                                "meses": {
                                    "mes_1": {
                                        "dias": {
                                            "dia_15": 1,
                                        },
                                        "total_mes": 1,
                                    },
                                },
                                "total_ano": 1,
                            },
                        },
                    ],
                },
                "bolsa_familia": {
                    "indicador": "Atendimentos realizados - Bolsa Família",
                    "servicos": [
                        {
                            "id": str(self.servico_bolsa_familia.id),
                            "nome": self.servico_bolsa_familia.nome,
                            "valores": {
                                "indicador": self.servico_bolsa_familia.nome,
                                "meses": {
                                    "mes_1": {
                                        "dias": {
                                            "dia_10": 1,
                                        },
                                        "total_mes": 1,
                                    },
                                },
                                "total_ano": 1,
                            },
                        }
                    ],
                },
            },
        )


class RelatorioQuantitativoMensalAPITestCase(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="quantitativo@example.com",
            username="quantitativo@example.com",
            nome_completo="Usuario Quantitativo",
            cpf="39053344705",
            telefone="85988887777",
            password="Senha@123",
        )
        view_permission = Permission.objects.get(codename="view_prontuario")
        self.user.user_permissions.add(view_permission)
        self.client.force_authenticate(self.user)

        bairro = Bairro.objects.create(nome="Centro")
        self.unidade = UnidadeCras.objects.create(
            nome="CRAS Centro",
            logradouro="Rua A",
            numero="100",
            cep="60000-000",
            bairro=bairro,
            telefone="8533333333",
            email="cras-centro@example.com",
        )
        self.outra_unidade = UnidadeCras.objects.create(
            nome="CRAS Bairro",
            logradouro="Rua B",
            numero="200",
            cep="60000-001",
            bairro=bairro,
            telefone="8544444444",
            email="cras-bairro-quantitativo@example.com",
        )

    @staticmethod
    def _definir_data_criacao(prontuario, data_criacao):
        Prontuario.objects.filter(id=prontuario.id).update(
            created_at=timezone.make_aware(data_criacao)
        )

    @staticmethod
    def _definir_data_criacao_anotacao(anotacao, data_criacao):
        AnotacaoPlanejamento.objects.filter(id=anotacao.id).update(
            created_at=timezone.make_aware(data_criacao)
        )

    @staticmethod
    def _criar_cidadao(indice):
        return Cidadao.objects.create(
            nome=f"Pessoa Quantitativo {indice}",
            cpf=f"9{indice:010d}",
            data_nascimento=date(1990, 1, 1),
            telefone="85999999999",
        )

    def test_deve_retornar_quantitativos_filtrando_mes_ano_unidade(self):
        prontuario_janeiro_1 = Prontuario.objects.create(unidade_inicial=self.unidade)
        prontuario_janeiro_2 = Prontuario.objects.create(unidade_inicial=self.unidade)
        prontuario_fevereiro = Prontuario.objects.create(unidade_inicial=self.unidade)
        prontuario_busca_ativa = Prontuario.objects.create(unidade_inicial=self.unidade)
        prontuario_outra_unidade = Prontuario.objects.create(
            unidade_inicial=self.outra_unidade
        )

        self._definir_data_criacao(prontuario_janeiro_1, datetime(2026, 1, 10, 8, 0))
        self._definir_data_criacao(prontuario_janeiro_2, datetime(2026, 1, 20, 9, 0))
        self._definir_data_criacao(prontuario_fevereiro, datetime(2026, 2, 5, 10, 0))
        self._definir_data_criacao(prontuario_busca_ativa, datetime(2026, 2, 7, 10, 0))
        self._definir_data_criacao(
            prontuario_outra_unidade,
            datetime(2026, 1, 15, 11, 0),
        )
        PessoaReferencia.objects.create(
            prontuario=prontuario_janeiro_1,
            pessoa_referencia=self._criar_cidadao(1),
            forma_ingresso="ESPONTANEA",
        )
        PessoaReferencia.objects.create(
            prontuario=prontuario_janeiro_2,
            pessoa_referencia=self._criar_cidadao(2),
            forma_ingresso="PROTECAO_ESPECIal",
        )
        PessoaReferencia.objects.create(
            prontuario=prontuario_fevereiro,
            pessoa_referencia=self._criar_cidadao(3),
            forma_ingresso="OUTROS",
        )
        PessoaReferencia.objects.create(
            prontuario=prontuario_busca_ativa,
            pessoa_referencia=self._criar_cidadao(5),
            forma_ingresso="ATIVA",
        )
        PessoaReferencia.objects.create(
            prontuario=prontuario_outra_unidade,
            pessoa_referencia=self._criar_cidadao(4),
            forma_ingresso="ESPONTANEA",
        )
        hoje = timezone.localdate()
        data_antiga = hoje - timedelta(days=120)
        data_recente = hoje - timedelta(days=30)
        NovoIngresso.objects.create(
            prontuario=prontuario_janeiro_1,
            data_ingresso=data_antiga,
            motivo="Demanda espontanea",
        )
        NovoIngresso.objects.create(
            prontuario=prontuario_janeiro_1,
            data_ingresso=date(2026, 1, 10),
            motivo="Reingresso",
        )
        NovoIngresso.objects.create(
            prontuario=prontuario_janeiro_2,
            data_ingresso=data_antiga,
            motivo="Encaminhamento",
        )
        RegistroDesligamento.objects.create(
            prontuario=prontuario_janeiro_2,
            data_desligamento=date(2026, 1, 25),
            motivo="METAS",
        )
        NovoIngresso.objects.create(
            prontuario=prontuario_fevereiro,
            data_ingresso=data_recente,
            motivo="Busca ativa",
        )
        NovoIngresso.objects.create(
            prontuario=prontuario_busca_ativa,
            data_ingresso=data_recente,
            motivo="Busca ativa",
        )
        NovoIngresso.objects.create(
            prontuario=prontuario_outra_unidade,
            data_ingresso=date(2026, 1, 15),
            motivo="Demanda espontanea",
        )
        RegistroDesligamento.objects.create(
            prontuario=prontuario_outra_unidade,
            data_desligamento=date(2026, 1, 26),
            motivo="METAS",
        )
        anotacao_recente = AnotacaoPlanejamento.objects.create(
            prontuario=prontuario_janeiro_1,
            anotacao="Registro recente de acompanhamento",
            tecnico_responsavel=self.user,
        )
        self._definir_data_criacao_anotacao(
            anotacao_recente,
            datetime.combine(data_recente, datetime.min.time()),
        )
        anotacao_antiga = AnotacaoPlanejamento.objects.create(
            prontuario=prontuario_fevereiro,
            anotacao="Registro antigo de acompanhamento",
            tecnico_responsavel=self.user,
        )
        self._definir_data_criacao_anotacao(
            anotacao_antiga,
            datetime.combine(data_antiga, datetime.min.time()),
        )
        anotacao_desligada = AnotacaoPlanejamento.objects.create(
            prontuario=prontuario_janeiro_2,
            anotacao="Registro recente de familia desligada",
            tecnico_responsavel=self.user,
        )
        self._definir_data_criacao_anotacao(
            anotacao_desligada,
            datetime.combine(data_recente, datetime.min.time()),
        )

        response = self.client.get(
            reverse("relatorio-quantitativo-mensal"),
            {
                "mes_referencia": 1,
                "ano_referencia": 2026,
                "unidade_cras": self.unidade.id,
            },
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["total_prontuarios"], 4)
        self.assertEqual(
            response.data["result"]["total_prontuarios_demanda_espontanea"],
            1,
        )
        self.assertEqual(
            response.data["result"]["total_prontuarios_protecao_especial"],
            1,
        )
        self.assertEqual(
            response.data["result"]["total_prontuarios_outros_ingressos"],
            1,
        )
        self.assertEqual(
            response.data["result"]["total_prontuarios_busca_ativa"],
            1,
        )
        self.assertEqual(response.data["result"]["familias_em_acompanhamento"], 3)
        self.assertEqual(
            response.data["result"]["familias_em_acompanhamento_mais_de_tres_meses"],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "familias_que_iniciaram_acompanhamento_no_mes_referencia"
            ],
            1,
        )
        self.assertEqual(
            response.data["result"][
                "familias_desligadas_do_acompanhamento_no_mes_referencia"
            ],
            1,
        )
        self.assertNotIn(
            "prontuarios_criados_no_mes_referencia",
            response.data["result"],
        )
        self.assertEqual(response.data["result"]["mes_referencia"], 1)
        self.assertEqual(response.data["result"]["ano_referencia"], 2026)
        self.assertEqual(response.data["result"]["unidade_cras"], str(self.unidade.id))
