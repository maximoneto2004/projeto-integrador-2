from django.utils import timezone
from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from medicamentos import services
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from prontuario.models import ReceitaMedicamento
from unidade_posto.models import UnidadePosto


class MedicamentoSerializer(serializers.ModelSerializer):
    forma_farmaceutica_display = serializers.CharField(source="get_forma_farmaceutica_display", read_only=True)
    unidade_medida_display = serializers.CharField(source="get_unidade_medida_display", read_only=True)
    via_administracao_display = serializers.CharField(source="get_via_administracao_display", read_only=True)
    descricao_completa = serializers.CharField(source="__str__", read_only=True)

    class Meta:
        model = Medicamento
        fields = [
            "id",
            "nome",
            "principio_ativo",
            "forma_farmaceutica",
            "forma_farmaceutica_display",
            "concentracao",
            "unidade_medida",
            "unidade_medida_display",
            "via_administracao",
            "via_administracao_display",
            "controlado",
            "classe_terapeutica",
            "fabricante",
            "codigo_registro",
            "observacoes",
            "estoque_minimo",
            "descricao_completa",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        validators = [
            UniqueTogetherValidator(
                queryset=Medicamento.objects.all(),
                fields=["nome", "concentracao", "unidade_medida", "forma_farmaceutica"],
                message="Já existe um medicamento cadastrado com este nome, concentração, unidade e forma farmacêutica.",
            )
        ]

    # String vazia colidiria na constraint unique; registro ausente deve ser NULL.
    def validate_codigo_registro(self, value):
        if not value:
            return None
        return value.strip() or None


class LoteMedicamentoSerializer(serializers.ModelSerializer):
    medicamento_descricao = serializers.CharField(source="medicamento.__str__", read_only=True)
    unidade_nome = serializers.CharField(source="unidade.nome", read_only=True)
    vencido = serializers.BooleanField(read_only=True)

    class Meta:
        model = LoteMedicamento
        fields = [
            "id",
            "medicamento",
            "medicamento_descricao",
            "unidade",
            "unidade_nome",
            "numero_lote",
            "validade",
            "quantidade_inicial",
            "quantidade_atual",
            "fornecedor",
            "data_entrada",
            "vencido",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "quantidade_atual", "created_at", "updated_at"]
        validators = [
            UniqueTogetherValidator(
                queryset=LoteMedicamento.objects.all(),
                fields=["medicamento", "unidade", "numero_lote"],
                message="Este lote já está cadastrado para este medicamento nesta unidade.",
            )
        ]

    def validate_validade(self, value):
        if self.instance is None and value < timezone.localdate():
            raise serializers.ValidationError("Não é possível dar entrada em um lote já vencido.")
        return value

    def create(self, validated_data):
        return services.registrar_lote(self.context["request"].user, **validated_data)


class LoteMedicamentoUpdateSerializer(LoteMedicamentoSerializer):
    """Quantidades só mudam via movimentação; medicamento e unidade são fixos após a entrada."""

    class Meta(LoteMedicamentoSerializer.Meta):
        read_only_fields = LoteMedicamentoSerializer.Meta.read_only_fields + [
            "medicamento",
            "unidade",
            "quantidade_inicial",
        ]
        validators = []


class MovimentacaoEstoqueSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    lote_numero = serializers.CharField(source="lote.numero_lote", read_only=True)
    medicamento_id = serializers.UUIDField(source="lote.medicamento_id", read_only=True)
    medicamento_descricao = serializers.CharField(source="lote.medicamento.__str__", read_only=True)
    unidade_id = serializers.UUIDField(source="lote.unidade_id", read_only=True)
    usuario_nome = serializers.CharField(source="usuario.nome_completo", read_only=True, default=None)
    quantidade = serializers.IntegerField(
        help_text="Na criação: quantidade positiva; em AJUSTE, use negativo para reduzir o saldo. "
        "Na leitura: efeito com sinal no saldo do lote."
    )

    class Meta:
        model = MovimentacaoEstoque
        fields = [
            "id",
            "lote",
            "lote_numero",
            "medicamento_id",
            "medicamento_descricao",
            "unidade_id",
            "tipo",
            "tipo_display",
            "quantidade",
            "saldo_apos",
            "usuario",
            "usuario_nome",
            "data",
            "motivo",
            "receita_item",
        ]
        read_only_fields = ["id", "saldo_apos", "usuario", "data", "receita_item"]

    def create(self, validated_data):
        return services.movimentar_lote(
            self.context["request"].user,
            lote_id=validated_data["lote"].pk,
            tipo=validated_data["tipo"],
            quantidade=validated_data["quantidade"],
            motivo=validated_data.get("motivo"),
        )


class DispensacaoSerializer(serializers.Serializer):
    medicamento = serializers.PrimaryKeyRelatedField(queryset=Medicamento.objects.filter(is_active=True))
    unidade = serializers.PrimaryKeyRelatedField(queryset=UnidadePosto.objects.all())
    quantidade = serializers.IntegerField(min_value=1)
    receita_item = serializers.PrimaryKeyRelatedField(
        queryset=ReceitaMedicamento.objects.all(), required=False, allow_null=True
    )
    motivo = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=600)
