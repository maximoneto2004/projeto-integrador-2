from rest_framework import serializers
from django.utils import timezone

from cidadaos.models import Cidadao, normalize_nome
from app.serializers import BairroSerializer
from unidade_cras.serializers import UnidadeCrasIdNomeSerializer
from unidade_cras.models import UnidadeCras


class CidadaoSerializer(serializers.ModelSerializer):
    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("nome"):
            data["nome"] = normalize_nome(data["nome"])
        return data

    class Meta:
        model = Cidadao
        fields = "__all__"
    
    def validate(self, attrs):
        attrs = super().validate(attrs)
        if self.instance is not None:
            return attrs
        
        bairro = attrs.get("bairro")
        print(bairro, " Bairroooooooooooooooooo")

        if not bairro:
            raise serializers.ValidationError(
                    {"bairro": "Verifique se o bairro está correto e pertence a cidade de Fortaleza, tente novamente."}
                )
        return attrs
        
        

    def create(self, validated_data):
        bairro = validated_data.get("bairro")
        unidade_origem = validated_data.get("unidade_origem")

        if not unidade_origem:
            if bairro:
                unidade = (
                    UnidadeCras.objects.filter(bairros_abrangencia=bairro, is_active=True)
                    .order_by("id")
                    .first()
                )
                if unidade:
                    validated_data["unidade_origem"] = unidade
            # else:
            #     raise serializers.ValidationError(
            #         {"bairro": "Defina um bairro para o cidadão."}
            #     )
            # return attrs
        return super().create(validated_data)


class CidadaoListDetailSerializer(serializers.ModelSerializer):

    bairro = BairroSerializer()
    unidade_origem = UnidadeCrasIdNomeSerializer(read_only=True)
    agendamentos = serializers.SerializerMethodField()
    # territorio = serializers.SerializerMethodField()

    def get_agendamentos(self, obj):
        from agendamentos.serializers import AgendamentoSimpleSerializer

        return AgendamentoSimpleSerializer(
            obj.agendamentos.all(),
            many=True,
        ).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get("nome"):
            data["nome"] = normalize_nome(data["nome"])
        return data

    def get_territorio(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return None
        if not user.groups.filter(name__iexact="recepcionista").exists():
            return None

        from usuarios.models import EscalaTrabalho

        dia_semana_atual = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"][
            timezone.localdate().weekday()
        ]
        escalas = EscalaTrabalho.objects.select_related("unidade").filter(
            profissional=user, is_active=True
        )
        escala_ativa = next(
            (esc for esc in escalas if dia_semana_atual in esc.dias_semana), None
        )
        if not escala_ativa:
            return None

        return (
            obj.bairro_id is not None
            and escala_ativa.unidade.bairros_abrangencia.filter(id=obj.bairro_id).exists()
        )

    class Meta:
        model = Cidadao
        fields = [
            "id",
            "nome",
            "cpf",
            "email",
            "telefone",
            "data_nascimento",
            "sexo",
            "logradouro",
            "numero",
            "bairro",
            "cep",
            "complemento",
            "agendamentos",
            "apelido",
            # "territorio",
            "unidade_origem"
        ]
