from rest_framework import serializers
from app.serializers import BairroSerializer
from .models import BloqueioHorario, ServicoUnidadeCras, UnidadeCras



EMPTY_METRICAS = {
    "atendimentos_total": 0,
    "profissionais_total": 0,
    "profissionais": [],
    "nota_avaliacao_media": 0,
    "nota_avaliacao_total": 0,
    "tempo_medio_atendimento_min": 0,
    "tempo_medio_esperado_min": 0,
    "tempo_medio_atendimento_comum_min": 0,
    "tempo_medio_atendimento_especializado_min": 0,
    "tempo_medio_esperado_comum_min": 0,
    "tempo_medio_esperado_especializado_min": 0,
    "tempo_medio_espera_min": 0,
    "servicos_prestados_30d": 0,
    "servicos_distintos_30d": 0,
    "tempo_excedente_medio_min": 0,
    "pct_acima_esperado": 0,
    "atendimentos_comum_30d": 0,
    "atendimentos_especializado_30d": 0,
    "servicos_metricas": [],
    "origem_atendimentos": {"156": 0, "RECEPCAO": 0, "SITE": 0, "FILA": 0},
}

class UnidadeCrasSerializer(serializers.ModelSerializer):
    servicos = serializers.SerializerMethodField(read_only=True)

    def get_servicos(self, obj):
        servicos = obj.servicos_unidade.all()
        return ServicoUnidadeCrasSerializer(servicos, many=True, context=self.context).data


    class Meta:
        model = UnidadeCras
        fields = "__all__"


class UnidadeCrasSerializerDetail(serializers.ModelSerializer):
    bairros_abrangencia = BairroSerializer(many=True, read_only=True)

    class Meta:
        model = UnidadeCras
        fields = ["id", "nome", "bairros_abrangencia"]


class UnidadeCrasIdNomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadeCras
        fields = ["id", "nome"]

class UnidadeCrasMapaSerializer(serializers.ModelSerializer):
    bairro = BairroSerializer()
    metricas = serializers.SerializerMethodField()

  

    class Meta:
        model = UnidadeCras
        fields = [
            "id",
            "nome",
            "created_at",
            "logradouro",
            "numero",
            "complemento",
            "cep",
            "bairro",
            "telefone",
            "email",
            "latitude",
            "longitude",
            "metricas"
        ]


    def get_metricas(self, obj):
        metricas_por_unidade = self.context.get("metricas_por_unidade", {})
        return metricas_por_unidade.get(str(obj.id), EMPTY_METRICAS)


class ServicoUnidadeCrasSerializer(serializers.ModelSerializer):
    servico_nome = serializers.CharField(source="servico.nome", read_only=True)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        instance = getattr(self, "instance", None)

        unidade = attrs.get("unidade") or (instance.unidade if instance else None)
        servico = attrs.get("servico") or (instance.servico if instance else None)
        dias_semana = attrs.get("dias_semana") or (
            instance.dias_semana if instance else []
        )

        if not unidade or not servico or not dias_semana:
            return attrs

        conflitos = ServicoUnidadeCras.objects.filter(
            unidade=unidade,
            servico=servico,
            is_active=True,
        )
        if instance:
            conflitos = conflitos.exclude(pk=instance.pk)

        dias_novos = set(dias_semana or [])

        for outro in conflitos:
            dias_outro = set(outro.dias_semana or [])
            if dias_novos == dias_outro:
                raise serializers.ValidationError(
                    "Conflito: serviço já configurado para os mesmos dias da semana."
                )

        return attrs

    class Meta:
        model = ServicoUnidadeCras
        fields = [
            "id",
            "unidade",
            "servico",
            "servico_nome",
            "dias_semana",
            "mesmo_expediente",
            "hora_manha_inicio",
            "hora_manha_fim",
            "hora_tarde_inicio",
            "hora_tarde_fim",
            "created_at",
            "updated_at",
            "is_active",
        ]

class BloqueioHorarioSerializer(serializers.ModelSerializer):
    unidade = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=UnidadeCras.objects.all(),
        source="cras",
    )

    class Meta:
        model = BloqueioHorario
        fields = [
            "id",
            "unidade",
            "data",
            "data_final",
            "hora_inicio",
            "hora_fim",
            "motivo",
            "criado_por",
            "alterado_por",
            "justificativa_alteracao",
            "created_at",
            "updated_at",
            "is_active",
        ]
