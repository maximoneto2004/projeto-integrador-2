from datetime import date

from django.contrib.auth import get_user_model
from django.contrib.auth.models import Permission
from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from app.models import Bairro
from cidadaos.models import Cidadao
from prontuario.models import (
    CondicaoEducacional,
    AcompanhamentoLAPSC,
    CondicoesDeSaude,
    CondicaoEducacionalMembro,
    DescumprimentoCondicionalidadesBolsa,
    DescumprimentoEducacional,
    ExclusaoMembroComposicao,
    MedidaSocioEducativa,
    MedidaSocioEducativaMembro,
    MembroComposicao,
    NovoIngresso,
    Prontuario,
    RegistroDesligamento,
    SaudeCuidadosMembro,
    TrabalhoRendimento,
    TrabalhoRendimentoMembro,
)
from prontuario.serializers import (
    ExclusaoMembroComposicaoSerializer,
    MembroComposicaoSerializer,
)
from unidade_cras.models import UnidadeCras


class RegistroDesligamentoModelTest(TestCase):
    def setUp(self):
        self.bairro = Bairro.objects.create(nome="Centro")
        self.unidade = UnidadeCras.objects.create(
            nome="CRAS Centro",
            logradouro="Rua A",
            numero="100",
            cep="58000-000",
            bairro=self.bairro,
            telefone="83999999999",
            email="cras@example.com",
        )
        self.prontuario = Prontuario.objects.create(unidade_inicial=self.unidade)

    def test_nao_permite_desligamento_sem_novo_ingresso(self):
        with self.assertRaises(ValidationError) as exc:
            RegistroDesligamento.objects.create(
                prontuario=self.prontuario,
                data_desligamento=date(2026, 3, 30),
                motivo="MUDANCA",
            )

        self.assertIn("prontuario", exc.exception.message_dict)

    def test_permite_desligamento_quando_existe_novo_ingresso(self):
        NovoIngresso.objects.create(
            prontuario=self.prontuario,
            data_ingresso=date(2026, 3, 1),
            motivo="Retorno ao acompanhamento",
        )

        desligamento = RegistroDesligamento.objects.create(
            prontuario=self.prontuario,
            data_desligamento=date(2026, 3, 30),
            motivo="MUDANCA",
        )

        self.assertEqual(desligamento.prontuario, self.prontuario)


class ExclusaoMembroComposicaoSerializerTest(TestCase):
    def setUp(self):
        self.bairro = Bairro.objects.create(nome="Centro")
        self.unidade = UnidadeCras.objects.create(
            nome="CRAS Centro",
            logradouro="Rua A",
            numero="100",
            cep="58000-000",
            bairro=self.bairro,
            telefone="83999999999",
            email="cras@example.com",
        )
        self.prontuario = Prontuario.objects.create(unidade_inicial=self.unidade)
        self.cidadao = Cidadao.objects.create(
            nome="Membro Teste",
            cpf="12345678901",
            data_nascimento=date(1990, 1, 1),
            telefone="83999999999",
        )
        self.membro = MembroComposicao.objects.create(
            prontuario=self.prontuario,
            cidadao=self.cidadao,
            parentesco="FILHO",
            ativo=True,
        )

    def test_deve_desativar_membro_e_dependencias_sem_apagar_registros(self):
        condicao_educacional = CondicaoEducacionalMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
        )
        trabalho_rendimento = TrabalhoRendimentoMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
        )
        saude_cuidados = SaudeCuidadosMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
        )
        medida_socioeducativa = MedidaSocioEducativaMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
        )
        acompanhamento_lapsc = AcompanhamentoLAPSC.objects.create(
            prontuario=self.prontuario,
            membro=medida_socioeducativa,
        )

        serializer = ExclusaoMembroComposicaoSerializer(
            data={"membro_id": str(self.membro.id), "motivo": "Saiu da família"}
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        exclusao = serializer.save()

        self.membro.refresh_from_db()
        condicao_educacional.refresh_from_db()
        trabalho_rendimento.refresh_from_db()
        saude_cuidados.refresh_from_db()
        medida_socioeducativa.refresh_from_db()
        acompanhamento_lapsc.refresh_from_db()
        exclusao.refresh_from_db()

        self.assertFalse(self.membro.is_active)
        self.assertFalse(condicao_educacional.is_active)
        self.assertFalse(trabalho_rendimento.is_active)
        self.assertFalse(saude_cuidados.is_active)
        self.assertFalse(medida_socioeducativa.is_active)
        self.assertFalse(acompanhamento_lapsc.is_active)
        self.assertTrue(MembroComposicao.objects.filter(pk=self.membro.pk).exists())
        self.assertEqual(exclusao.prontuario, self.prontuario)
        self.assertEqual(exclusao.membro, self.cidadao.nome)
        self.assertTrue(
            ExclusaoMembroComposicao.objects.filter(pk=exclusao.pk).exists()
        )

    def test_deve_reativar_membro_e_dependencias_ao_reincluir_mesmo_cidadao_no_mesmo_prontuario(self):
        condicao_educacional = CondicaoEducacionalMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
            is_active=False,
        )
        trabalho_rendimento = TrabalhoRendimentoMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
            is_active=False,
        )
        saude_cuidados = SaudeCuidadosMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
            is_active=False,
        )
        medida_socioeducativa = MedidaSocioEducativaMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
            is_active=False,
        )
        acompanhamento_lapsc = AcompanhamentoLAPSC.objects.create(
            prontuario=self.prontuario,
            membro=medida_socioeducativa,
            is_active=False,
        )

        self.membro.is_active = False
        self.membro.ativo = False
        self.membro.data_saida = date(2026, 4, 16)
        self.membro.save(update_fields=["is_active", "ativo", "data_saida", "updated_at"])

        serializer = MembroComposicaoSerializer(
            data={
                "prontuario": str(self.prontuario.id),
                "cidadao": str(self.cidadao.id),
                "parentesco": "FILHO",
                "ativo": True,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        membro_reativado = serializer.save()

        self.membro.refresh_from_db()
        condicao_educacional.refresh_from_db()
        trabalho_rendimento.refresh_from_db()
        saude_cuidados.refresh_from_db()
        medida_socioeducativa.refresh_from_db()
        acompanhamento_lapsc.refresh_from_db()

        self.assertEqual(membro_reativado.id, self.membro.id)
        self.assertTrue(self.membro.is_active)
        self.assertTrue(self.membro.ativo)
        self.assertIsNone(self.membro.data_saida)
        self.assertTrue(condicao_educacional.is_active)
        self.assertTrue(trabalho_rendimento.is_active)
        self.assertTrue(saude_cuidados.is_active)
        self.assertTrue(medida_socioeducativa.is_active)
        self.assertTrue(acompanhamento_lapsc.is_active)
        self.assertEqual(
            MembroComposicao.objects.filter(
                prontuario=self.prontuario,
                cidadao=self.cidadao,
            ).count(),
            1,
        )

    def test_deve_criar_novo_membro_em_outra_familia_quando_vinculo_anterior_estiver_desativado(self):
        condicao_antiga = CondicaoEducacionalMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
            is_active=False,
        )
        trabalho_antigo = TrabalhoRendimentoMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
            is_active=False,
        )
        saude_antiga = SaudeCuidadosMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
            is_active=False,
        )
        medida_antiga = MedidaSocioEducativaMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro,
            is_active=False,
        )

        self.membro.is_active = False
        self.membro.ativo = False
        self.membro.save(update_fields=["is_active", "ativo", "updated_at"])

        novo_prontuario = Prontuario.objects.create(unidade_inicial=self.unidade)

        serializer = MembroComposicaoSerializer(
            data={
                "prontuario": str(novo_prontuario.id),
                "cidadao": str(self.cidadao.id),
                "parentesco": "FILHO",
                "ativo": True,
            }
        )

        self.assertTrue(serializer.is_valid(), serializer.errors)
        novo_membro = serializer.save()

        self.membro.refresh_from_db()
        condicao_antiga.refresh_from_db()
        trabalho_antigo.refresh_from_db()
        saude_antiga.refresh_from_db()
        medida_antiga.refresh_from_db()

        self.assertNotEqual(novo_membro.id, self.membro.id)
        self.assertEqual(novo_membro.prontuario, novo_prontuario)
        self.assertTrue(novo_membro.is_active)
        self.assertTrue(novo_membro.ativo)
        self.assertFalse(self.membro.is_active)
        self.assertFalse(self.membro.ativo)
        self.assertFalse(condicao_antiga.is_active)
        self.assertFalse(trabalho_antigo.is_active)
        self.assertFalse(saude_antiga.is_active)
        self.assertFalse(medida_antiga.is_active)

        self.assertTrue(
            CondicaoEducacionalMembro.objects.filter(
                prontuario=novo_prontuario,
                membro=novo_membro,
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            TrabalhoRendimentoMembro.objects.filter(
                prontuario=novo_prontuario,
                membro=novo_membro,
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            SaudeCuidadosMembro.objects.filter(
                prontuario=novo_prontuario,
                membro=novo_membro,
                is_active=True,
            ).exists()
        )
        self.assertTrue(
            MedidaSocioEducativaMembro.objects.filter(
                prontuario=novo_prontuario,
                membro=novo_membro,
                is_active=True,
            ).exists()
        )


class MembroComposicaoApiAtivosTest(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            email="teste-membro@example.com",
            username="teste-membro@example.com",
            nome_completo="Usuario Teste Membro",
            cpf="39053344705",
            telefone="83999999998",
            password="Senha@123",
        )
        self.user.user_permissions.add(
            Permission.objects.get(codename="view_membrocomposicao"),
            Permission.objects.get(codename="view_trabalhorendimentomembro"),
            Permission.objects.get(codename="view_condicaoeducacional"),
            Permission.objects.get(codename="view_condicoesdesaude"),
            Permission.objects.get(codename="view_medidasocioeducativa"),
            Permission.objects.get(codename="view_trabalhorendimento"),
            Permission.objects.get(codename="view_descumprimentoeducacional"),
            Permission.objects.get(codename="view_descumprimentocondicionalidadesbolsa"),
            Permission.objects.get(codename="view_acompanhamentolapsc"),
            Permission.objects.get(codename="view_medidasocioeducativamembro"),
        )
        self.client.force_authenticate(self.user)

        bairro = Bairro.objects.create(nome="Centro API")
        unidade = UnidadeCras.objects.create(
            nome="CRAS API",
            logradouro="Rua A",
            numero="100",
            cep="58000-000",
            bairro=bairro,
            telefone="83999999997",
            email="cras-api@example.com",
        )
        self.prontuario = Prontuario.objects.create(unidade_inicial=unidade)
        self.cidadao_ativo = Cidadao.objects.create(
            nome="Membro Ativo",
            cpf="12345678911",
            data_nascimento=date(1990, 1, 1),
            telefone="83999999996",
        )
        self.cidadao_inativo = Cidadao.objects.create(
            nome="Membro Inativo",
            cpf="12345678912",
            data_nascimento=date(1991, 1, 1),
            telefone="83999999995",
        )
        self.membro_ativo = MembroComposicao.objects.create(
            prontuario=self.prontuario,
            cidadao=self.cidadao_ativo,
            parentesco="FILHO",
            ativo=True,
            is_active=True,
        )
        self.membro_inativo = MembroComposicao.objects.create(
            prontuario=self.prontuario,
            cidadao=self.cidadao_inativo,
            parentesco="FILHO",
            ativo=False,
            is_active=False,
        )
        self.trabalho_ativo = TrabalhoRendimentoMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_ativo,
            is_active=True,
        )
        self.trabalho_inativo = TrabalhoRendimentoMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_inativo,
            is_active=False,
        )

    def test_listagem_de_membros_deve_retornar_apenas_ativos(self):
        response = self.client.get(reverse("Membro-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["result"]), 1)
        self.assertEqual(
            response.data["result"][0]["cidadao"]["id"],
            self.membro_ativo.cidadao_id,
        )

    def test_listagem_de_trabalho_rendimento_membro_deve_retornar_apenas_ativos(self):
        response = self.client.get(reverse("trabalho-rendimento-membro-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["result"]), 1)
        self.assertEqual(response.data["result"][0]["id"], str(self.trabalho_ativo.id))

    def test_agregadores_devem_retornar_apenas_relacionamentos_ativos(self):
        condicao_educacional = CondicaoEducacional.objects.create(
            prontuario=self.prontuario
        )
        condicao_educacional_ativa = CondicaoEducacionalMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_ativo,
            is_active=True,
        )
        condicao_educacional_inativa = CondicaoEducacionalMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_inativo,
            is_active=False,
        )
        descumprimento_educacional_ativo = DescumprimentoEducacional.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_ativo,
            efeito_codigo="ADVERTENCIA",
            is_active=True,
        )
        descumprimento_educacional_inativo = DescumprimentoEducacional.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_inativo,
            efeito_codigo="ADVERTENCIA",
            is_active=False,
        )
        condicao_educacional.condicao_educacional_membro.add(
            condicao_educacional_ativa,
            condicao_educacional_inativa,
        )
        condicao_educacional.descumprimento_educacional_membro.add(
            descumprimento_educacional_ativo,
            descumprimento_educacional_inativo,
        )

        condicoes_saude = CondicoesDeSaude.objects.create(prontuario=self.prontuario)
        saude_ativa = SaudeCuidadosMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_ativo,
            is_active=True,
        )
        saude_inativa = SaudeCuidadosMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_inativo,
            is_active=False,
        )
        descumprimento_saude_ativo = (
            DescumprimentoCondicionalidadesBolsa.objects.create(
                prontuario=self.prontuario,
                membro=self.membro_ativo,
                efeito_codigo="ADVERTENCIA",
                is_active=True,
            )
        )
        descumprimento_saude_inativo = (
            DescumprimentoCondicionalidadesBolsa.objects.create(
                prontuario=self.prontuario,
                membro=self.membro_inativo,
                efeito_codigo="ADVERTENCIA",
                is_active=False,
            )
        )
        condicoes_saude.condicoes_saude_membro.add(saude_ativa, saude_inativa)
        condicoes_saude.descumprimento_condicionalidade.add(
            descumprimento_saude_ativo,
            descumprimento_saude_inativo,
        )

        trabalho_rendimento = TrabalhoRendimento.objects.create(
            prontuario=self.prontuario
        )
        trabalho_rendimento.trabalho_rendimento_membro.add(
            self.trabalho_ativo,
            self.trabalho_inativo,
        )

        medida_membro_ativa = MedidaSocioEducativaMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_ativo,
            is_active=True,
        )
        medida_membro_inativa = MedidaSocioEducativaMembro.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_inativo,
            is_active=False,
        )
        lapsc_ativo = AcompanhamentoLAPSC.objects.create(
            prontuario=self.prontuario,
            membro=medida_membro_ativa,
            is_active=True,
        )
        lapsc_inativo = AcompanhamentoLAPSC.objects.create(
            prontuario=self.prontuario,
            membro=medida_membro_inativa,
            is_active=False,
        )
        medida_socioeducativa = MedidaSocioEducativa.objects.create(
            prontuario=self.prontuario
        )
        medida_socioeducativa.membro_socio_educativo.add(
            medida_membro_ativa,
            medida_membro_inativa,
        )
        medida_socioeducativa.acompanhamento_LAPSC_membro.add(
            lapsc_ativo,
            lapsc_inativo,
        )

        response_condicao = self.client.get(reverse("condicao-educacional-list"))
        response_saude = self.client.get(reverse("condicoes-de-saude-list"))
        response_trabalho = self.client.get(reverse("trabalho-rendimento-list"))
        response_medida = self.client.get(reverse("medida-socioeducativa-list"))

        self.assertEqual(response_condicao.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response_condicao.data["result"][0]["condicao_educacional_membro"],
            [str(condicao_educacional_ativa.id)],
        )
        self.assertEqual(
            response_condicao.data["result"][0]["descumprimento_educacional_membro"],
            [str(descumprimento_educacional_ativo.id)],
        )

        self.assertEqual(response_saude.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response_saude.data["result"][0]["condicoes_saude_membro"],
            [str(saude_ativa.id)],
        )
        self.assertEqual(
            response_saude.data["result"][0]["descumprimento_condicionalidade"],
            [str(descumprimento_saude_ativo.id)],
        )

        self.assertEqual(response_trabalho.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response_trabalho.data["result"][0]["trabalho_rendimento_membro"],
            [str(self.trabalho_ativo.id)],
        )

        self.assertEqual(response_medida.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response_medida.data["result"][0]["membro_socio_educativo"],
            [str(medida_membro_ativa.id)],
        )
        self.assertEqual(
            response_medida.data["result"][0]["acompanhamento_LAPSC_membro"],
            [str(lapsc_ativo.id)],
        )

    def test_descumprimento_condicionalidades_bolsa_deve_retornar_apenas_registros_ativos_de_membros_ativos(self):
        descumprimento_ativo = DescumprimentoCondicionalidadesBolsa.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_ativo,
            efeito_codigo="ADVERTENCIA",
            is_active=True,
        )
        DescumprimentoCondicionalidadesBolsa.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_inativo,
            efeito_codigo="ADVERTENCIA",
            is_active=True,
        )
        DescumprimentoCondicionalidadesBolsa.objects.create(
            prontuario=self.prontuario,
            membro=self.membro_ativo,
            efeito_codigo="ADVERTENCIA",
            is_active=False,
        )

        response = self.client.get(
            reverse("descumprimento-condicionalidades-bolsa-list")
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["result"]), 1)
        self.assertEqual(response.data["result"][0]["id"], str(descumprimento_ativo.id))
