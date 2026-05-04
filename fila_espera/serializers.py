from rest_framework import serializers
from fila_espera.models import FilaEspera

from cidadaos.serializers import CidadaoSerializer
from servicos.serializers import ServicoSerializer
from unidade_cras.serializers import UnidadeCrasSerializer


class FilaEsperaSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        instance = self.instance or FilaEspera()
        for key, value in attrs.items():
            setattr(instance, key, value)
        instance.clean()
        return attrs

    class Meta:
        model = FilaEspera
        fields = "__all__"


class FilaEsperaDetailSerializer(serializers.ModelSerializer):
    cidadao = CidadaoSerializer()
    servico = ServicoSerializer()
    unidade = UnidadeCrasSerializer()

    class Meta:
        model = FilaEspera
        fields = [
            "id",
            "cidadao",
            "servico",
            "unidade",
            "prioridade",
            "status",
            "urgencia",
            "created_at",
        ]
