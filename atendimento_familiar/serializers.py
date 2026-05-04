from rest_framework import serializers
from atendimento_familiar.models import FichaAtendimentoFamiliar, MembroFamiliar
from cidadaos.serializers import CidadaoListDetailSerializer
from prontuario.serializers import (
    ParentescoSerializer,
    FormaIngressoSerializer,
    OrgaoOrigemEncaminhamentoSerializer,
    ProntuarioSerializer,
    UnidadeSerializer
)
from unidade_cras.serializers import UnidadeCrasSerializerDetail
from app.serializers import BairroSerializer


class MembroFamiliarSerializer(serializers.ModelSerializer):
    class Meta:
        model = MembroFamiliar
        fields = "__all__"


class MembroFamiliarListDetailSerializer(serializers.ModelSerializer):
    cidadao = CidadaoListDetailSerializer()
    parentesco = ParentescoSerializer()

    class Meta:
        model = MembroFamiliar
        fields = ["id", "cidadao", "parentesco", "escolaridade", "ocupacao", "renda"]


class FichaAtendimentoFamiliarSerializer(serializers.ModelSerializer):
    class Meta:
        model = FichaAtendimentoFamiliar
        fields = "__all__"


class FichaAtendimentoFamiliarListDetailSerializer(serializers.ModelSerializer):
    unidade_de_atendimento = UnidadeCrasSerializerDetail()
    forma_ingresso = FormaIngressoSerializer()
    unidade = UnidadeSerializer()
    prontuario = ProntuarioSerializer()
    responsavel = CidadaoListDetailSerializer()
    membro_familiar = MembroFamiliarListDetailSerializer()
    bairro = BairroSerializer()

    class Meta:
        model = FichaAtendimentoFamiliar
        fields = [
            "id",
            "unidade_de_atendimento",
            "forma_ingresso",
            "unidade",
            "prontuario",
            "responsavel",
            "membro_familiar",
            "demanda_apresentada",
            "cidade",
            "estado",
            "bairro",
            "localizacao",
        ]
