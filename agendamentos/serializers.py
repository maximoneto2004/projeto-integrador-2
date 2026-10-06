from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from agendamentos.models import AgendaVaga
from agendamentos.models import Agendamento
from usuarios.models import EscalaTrabalho
from cidadaos.serializers import CidadaoSerializer

from servicos.serializers import ServicoListDetailSerializer
from unidade_posto.serializers import UnidadePostoSerializerDetail
from usuarios.serializers import UsuarioListDetailSerializer


class AgendaVagaSerializer(serializers.ModelSerializer):
    class Meta:
        model = AgendaVaga
        fields = "__all__"


class AgendamentoSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        attrs = super().validate(attrs)
        cidadao = attrs.get("cidadao")
        unidade = attrs.get("unidade")
        servico = attrs.get("servico")
        situacao = attrs.get("situacao")

        origem = attrs.get("origem")
        if self.instance is not None and origem is None:
            origem = self.instance.origem

        if self.instance is not None:
            cidadao = cidadao or self.instance.cidadao
            unidade = unidade or self.instance.unidade
            servico = servico or self.instance.servico
            situacao = situacao or self.instance.situacao
            try:
                Agendamento.validar_transicao(self.instance.situacao, situacao)
            except DjangoValidationError as error:
                raise serializers.ValidationError(error.message_dict)
        else:
            situacao = situacao or "AGENDADO"

        if (
            cidadao
            and servico
            and situacao not in Agendamento.STATUS_INATIVOS
            and Agendamento.possui_ativo_por_tipo(
                cidadao=cidadao,
                tipo_servico=servico.tipo_servico,
                exclude_pk=self.instance.pk if self.instance is not None else None,
            )
        ):
            raise serializers.ValidationError(
                "Já existe um agendamento ativo deste tipo para este cidadão."
            )

        if not cidadao or not unidade:
            return attrs

        motivo_territorio = (attrs.get("motivo_territorio") or "").strip()
        if self.instance is not None and "motivo_territorio" not in attrs:
            motivo_territorio = (self.instance.motivo_territorio or "").strip()


        if (
            cidadao.unidade_origem_id is not None
            and cidadao.unidade_origem_id != unidade.id and origem != "FILA"
            and not motivo_territorio
        ):
            raise serializers.ValidationError(
                {
                    "unidade": "A unidade escolhida difere da unidade de origem do cidadão. Por favor, marque o checkbox e informe o motivo."
                }
            )

        return attrs

    class Meta:
        model = Agendamento
        fields = "__all__"
        validators = []


class AgendamentoDetailSerializer(serializers.ModelSerializer):
    cidadao = CidadaoSerializer()
    servico = ServicoListDetailSerializer()
    unidade = UnidadePostoSerializerDetail()
    atendente = UsuarioListDetailSerializer()


    class Meta:
        model = Agendamento
        fields = [
            "id",
            "cidadao",
            "atendente",
            "servico",
            "unidade",
            "data",
            "horario",
            "situacao",
            "origem",
            "motivo_territorio",
            "final_atendimento",
            "observacoes_gerais",
            "servicos_adicionais",
        ]


class AgendamentoSimpleSerializer(serializers.ModelSerializer):
    atendente = UsuarioListDetailSerializer()

    class Meta:
        model = Agendamento
        fields = ["id", "data", "horario", "situacao", "atendente"]

