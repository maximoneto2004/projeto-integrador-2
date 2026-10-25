"""Serializers da área do cidadão: só o que o próprio cidadão pode ver ou enviar."""

from django.utils import timezone
from rest_framework import serializers

from agendamentos.models import Agendamento
from agendamentos.serializers import AgendamentoSerializer
from agendamentos.services import formatar_endereco_unidade, ofertas_agendaveis
from prontuario.models import Receita, ReceitaMedicamento
from prontuario.serializers import ReceitaSerializer


class AgendamentoCidadaoSerializer(serializers.ModelSerializer):
    servico = serializers.CharField(source="servico.nome")
    tipo_servico = serializers.CharField(source="servico.tipo_servico.nome", default=None)
    unidade = serializers.SerializerMethodField()
    situacao_display = serializers.CharField(source="get_situacao_display")

    class Meta:
        model = Agendamento
        fields = ["id", "servico", "tipo_servico", "unidade", "data", "horario", "situacao", "situacao_display"]

    def get_unidade(self, obj):
        return {"id": str(obj.unidade_id), "nome": obj.unidade.nome, "endereco": formatar_endereco_unidade(obj.unidade)}


class NovoAgendamentoCidadaoSerializer(AgendamentoSerializer):
    """Entrada do agendamento feito pelo cidadão. Cidadão e origem vêm da view; a unidade, da vaga."""

    class Meta(AgendamentoSerializer.Meta):
        fields = ["id", "cidadao", "unidade", "servico", "vaga", "origem", "motivo_territorio", "data", "horario"]
        read_only_fields = []
        extra_kwargs = {"unidade": {"required": False}, "vaga": {"required": True, "allow_null": False}}

    def validate(self, attrs):
        vaga = attrs["vaga"]
        agora = timezone.localtime()
        if (vaga.data, vaga.horario) <= (agora.date(), agora.time()):
            raise serializers.ValidationError({"vaga": "Este horário já passou. Escolha outra vaga."})
        if not ofertas_agendaveis(vaga.unidade_id).filter(servico=attrs["servico"]).exists():
            raise serializers.ValidationError({"servico": "Este serviço não é agendável nesta unidade."})
        attrs["unidade"] = vaga.unidade
        return super().validate(attrs)


class ReceitaItemCidadaoSerializer(serializers.ModelSerializer):
    quantidade_restante = serializers.IntegerField(read_only=True)
    status_dispensacao_display = serializers.CharField(source="get_status_dispensacao_display")

    class Meta:
        model = ReceitaMedicamento
        fields = [
            "id",
            "medicamento",
            "nome",
            "dosagem",
            "frequencia",
            "duracao",
            "instrucoes",
            "quantidade_prescrita",
            "quantidade_dispensada",
            "quantidade_restante",
            "status_dispensacao",
            "status_dispensacao_display",
        ]


class ReceitaCidadaoSerializer(ReceitaSerializer):
    # Sem diagnóstico nem dados do cadastro: a resposta passa pelo chat do agente.
    medicamentos = ReceitaItemCidadaoSerializer(many=True, read_only=True)
    cidadao_nome = None
    cidadao_cpf = None
    retirada_imediata = None

    class Meta:
        model = Receita
        fields = [
            "id",
            "unidade_nome",
            "profissional_nome",
            "data_emissao",
            "data_validade",
            "vencida",
            "status_dispensacao",
            "observacoes",
            "medicamentos",
        ]
