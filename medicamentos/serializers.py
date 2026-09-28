from rest_framework import serializers
from rest_framework.validators import UniqueTogetherValidator

from medicamentos.models import Medicamento


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
