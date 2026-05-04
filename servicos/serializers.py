from rest_framework import serializers

from servicos.models import Servico, ClasseServico, TipoServico


class ServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servico
        fields = "__all__"


class TipoServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServico
        fields = ["id", "nome", "descricao", "tempo_atendimento", "is_active"]


class ClasseServicoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClasseServico
        fields = ["id", "nome", "descricao", "is_active"]


class ServicoListDetailSerializer(serializers.ModelSerializer):
    classe = ClasseServicoSerializer()
    tipo_servico = TipoServicoSerializer()

    class Meta:
        model = Servico
        fields = ["id", "nome", "tipo_marcacao", "descricao", "classe", "tipo_servico", "is_active"]
