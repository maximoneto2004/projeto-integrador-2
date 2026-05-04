from rest_framework import serializers

from agendamentos.serializers import AgendamentoDetailSerializer
from encaminhamentos.models import CodigoArea, Encaminhamento


class CodigoAreaSerializer(serializers.ModelSerializer):
    def validate_codigo(self, value):
        queryset = CodigoArea.objects.filter(codigo=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            raise serializers.ValidationError("Já existe um código de área com este número.")
        return value

    class Meta:
        model = CodigoArea
        fields = "__all__"


class CodigoSimpleSerializer(serializers.ModelSerializer):
    class Meta:
        model = CodigoArea
        fields = ["id", "nome", "codigo"]


class EncaminhamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Encaminhamento
        fields = "__all__"


class EncaminhamentoListDetailSerializer(serializers.ModelSerializer):
    codigo_area = CodigoSimpleSerializer()
    unidade_origem_telefone = serializers.SerializerMethodField()
    agendamento = AgendamentoDetailSerializer()

    class Meta:
        model = Encaminhamento
        fields = [
            "id",
            "codigo_area",
            "unidade_origem",
            "unidade_origem_telefone",
            "unidade_destino",
            "motivo",
            "resumo",
            "orientacoes",
            "profissional",
            "agendamento",
        ]

    def get_unidade_origem_telefone(self, obj):
        unidade_agendamento = getattr(obj.agendamento, "unidade", None)
        if unidade_agendamento and getattr(unidade_agendamento, "nome", "") == obj.unidade_origem:
            return getattr(unidade_agendamento, "telefone", "") or ""

        cidadao = getattr(obj.agendamento, "cidadao", None)
        unidade_cidadao = getattr(cidadao, "unidade_origem", None) if cidadao else None
        if unidade_cidadao and getattr(unidade_cidadao, "nome", "") == obj.unidade_origem:
            return getattr(unidade_cidadao, "telefone", "") or ""

        return ""
