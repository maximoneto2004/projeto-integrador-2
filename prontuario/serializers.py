import re

from django.db import transaction
from rest_framework import serializers

from app.static_data import (
    STATUS_DISPENSACAO_DISPENSADO,
    STATUS_DISPENSACAO_PARCIAL,
    STATUS_DISPENSACAO_PENDENTE,
)
from cidadaos.models import Cidadao
from medicamentos.models import Medicamento
from prontuario.models import Receita, ReceitaMedicamento, RegistroAtendimento

SITUACOES_QUE_PERMITEM_REGISTRO = {"ATENDIMENTO", "FINALIZADO"}
CID10_REGEX = re.compile(r"^[A-Z][0-9]{2}(\.[0-9A-Z]{1,2})?$")


class ReceitaMedicamentoSerializer(serializers.ModelSerializer):
    medicamento = serializers.PrimaryKeyRelatedField(queryset=Medicamento.objects.filter(is_active=True))
    dosagem = serializers.CharField(max_length=100, required=False, allow_blank=True)
    quantidade_prescrita = serializers.IntegerField(min_value=1)
    quantidade_restante = serializers.IntegerField(read_only=True)
    status_dispensacao_display = serializers.CharField(source="get_status_dispensacao_display", read_only=True)
    controlado = serializers.BooleanField(source="medicamento.controlado", read_only=True, default=False)
    legado = serializers.SerializerMethodField()

    class Meta:
        model = ReceitaMedicamento
        fields = [
            "id",
            "medicamento",
            "nome",
            "controlado",
            "dosagem",
            "frequencia",
            "duracao",
            "instrucoes",
            "quantidade_prescrita",
            "quantidade_dispensada",
            "quantidade_restante",
            "status_dispensacao",
            "status_dispensacao_display",
            "legado",
        ]
        read_only_fields = ["id", "nome", "quantidade_dispensada", "status_dispensacao"]

    def get_legado(self, obj):
        return obj.medicamento_id is None

    def validate(self, attrs):
        medicamento = attrs["medicamento"]
        if not (attrs.get("dosagem") or "").strip():
            attrs["dosagem"] = f"{medicamento.concentracao} {medicamento.get_unidade_medida_display()}"
        attrs["nome"] = str(medicamento)
        return attrs


class ReceitaSerializer(serializers.ModelSerializer):
    medicamentos = ReceitaMedicamentoSerializer(many=True)
    cidadao_nome = serializers.CharField(source="cidadao.nome", read_only=True)
    cidadao_cpf = serializers.CharField(source="cidadao.cpf", read_only=True)
    profissional_nome = serializers.CharField(source="profissional.nome_completo", read_only=True)
    vencida = serializers.BooleanField(read_only=True)
    status_dispensacao = serializers.SerializerMethodField()

    class Meta:
        model = Receita
        fields = [
            "id",
            "agendamento",
            "cidadao",
            "cidadao_nome",
            "cidadao_cpf",
            "profissional",
            "profissional_nome",
            "data_emissao",
            "validade_dias",
            "data_validade",
            "vencida",
            "status_dispensacao",
            "diagnostico",
            "observacoes",
            "medicamentos",
        ]
        read_only_fields = [
            "id",
            "data_emissao",
            "data_validade",
            "cidadao",
            "cidadao_nome",
            "cidadao_cpf",
            "profissional",
            "profissional_nome",
        ]

    def get_status_dispensacao(self, obj):
        status_itens = {item.status_dispensacao for item in obj.medicamentos.all() if item.medicamento_id}
        if not status_itens or status_itens == {STATUS_DISPENSACAO_PENDENTE}:
            return STATUS_DISPENSACAO_PENDENTE
        if status_itens == {STATUS_DISPENSACAO_DISPENSADO}:
            return STATUS_DISPENSACAO_DISPENSADO
        return STATUS_DISPENSACAO_PARCIAL

    def validate_medicamentos(self, value):
        if not value:
            raise serializers.ValidationError("Informe pelo menos um medicamento.")
        ids = [item["medicamento"].pk for item in value]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("O mesmo medicamento foi informado mais de uma vez.")
        return value

    def validate(self, attrs):
        if self.instance and "agendamento" in attrs and attrs["agendamento"] != self.instance.agendamento:
            raise serializers.ValidationError({"agendamento": "Não é possível trocar o agendamento de uma receita."})
        if self.instance and "medicamentos" in attrs and self.instance.possui_dispensacao:
            raise serializers.ValidationError(
                {"medicamentos": "A receita já teve medicamentos dispensados; os itens não podem ser alterados."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        medicamentos_data = validated_data.pop("medicamentos")
        agendamento = validated_data["agendamento"]
        validated_data["cidadao"] = agendamento.cidadao
        validated_data.setdefault("profissional", self.context["request"].user if self.context.get("request") else None)
        receita = Receita.objects.create(**validated_data)
        for med in medicamentos_data:
            ReceitaMedicamento.objects.create(receita=receita, **med)
        return receita

    @transaction.atomic
    def update(self, instance, validated_data):
        medicamentos_data = validated_data.pop("medicamentos", None)
        for campo, valor in validated_data.items():
            setattr(instance, campo, valor)
        instance.save()
        if medicamentos_data is not None:
            instance.medicamentos.all().delete()
            for med in medicamentos_data:
                ReceitaMedicamento.objects.create(receita=instance, **med)
        return instance


class RegistroAtendimentoSerializer(serializers.ModelSerializer):
    profissional_nome = serializers.CharField(source="profissional.nome_completo", read_only=True)
    servico_nome = serializers.CharField(source="agendamento.servico.nome", read_only=True)
    unidade_nome = serializers.CharField(source="unidade.nome", read_only=True)
    classificacao_risco_display = serializers.CharField(source="get_classificacao_risco_display", read_only=True)
    imc = serializers.DecimalField(max_digits=5, decimal_places=1, read_only=True)
    cid = serializers.CharField(max_length=10, required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = RegistroAtendimento
        fields = [
            "id",
            "agendamento",
            "cidadao",
            "unidade",
            "unidade_nome",
            "profissional",
            "profissional_nome",
            "servico_nome",
            "classificacao_risco",
            "classificacao_risco_display",
            "queixa_principal",
            "subjetivo",
            "objetivo",
            "avaliacao",
            "cid",
            "plano",
            "pressao_sistolica",
            "pressao_diastolica",
            "frequencia_cardiaca",
            "frequencia_respiratoria",
            "temperatura",
            "saturacao_o2",
            "glicemia_capilar",
            "peso",
            "altura",
            "imc",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "cidadao", "unidade", "profissional", "created_at", "updated_at"]

    def validate_cid(self, value):
        cid = (value or "").strip().upper() or None
        if cid and not CID10_REGEX.match(cid):
            raise serializers.ValidationError("Informe um CID-10 válido, ex.: J06.9")
        return cid

    def validate_agendamento(self, agendamento):
        if self.instance is not None and agendamento != self.instance.agendamento:
            raise serializers.ValidationError("Não é possível trocar o agendamento de um registro.")
        if self.instance is None and agendamento.situacao not in SITUACOES_QUE_PERMITEM_REGISTRO:
            raise serializers.ValidationError("Só é possível registrar atendimentos em andamento ou finalizados.")
        return agendamento

    def validate(self, attrs):
        sistolica = attrs.get("pressao_sistolica", getattr(self.instance, "pressao_sistolica", None))
        diastolica = attrs.get("pressao_diastolica", getattr(self.instance, "pressao_diastolica", None))
        if (sistolica is None) != (diastolica is None):
            raise serializers.ValidationError({"pressao_diastolica": "Informe a pressão sistólica e a diastólica juntas."})
        if sistolica is not None and sistolica <= diastolica:
            raise serializers.ValidationError({"pressao_sistolica": "A pressão sistólica deve ser maior que a diastólica."})
        return attrs

    def create(self, validated_data):
        agendamento = validated_data["agendamento"]
        validated_data["cidadao"] = agendamento.cidadao
        validated_data["unidade"] = agendamento.unidade
        validated_data["profissional"] = self.context["request"].user
        return super().create(validated_data)


class DadosClinicosCidadaoSerializer(serializers.ModelSerializer):
    # Declarado aqui para aceitar CNS com máscara; os validadores do modelo rodariam antes da normalização.
    cns = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=30)

    class Meta:
        model = Cidadao
        fields = ["cns", "alergias", "condicoes_cronicas"]

    def validate_cns(self, value):
        digitos = "".join(ch for ch in (value or "") if ch.isdigit())
        if digitos and len(digitos) != 15:
            raise serializers.ValidationError("O CNS deve ter 15 dígitos.")
        if digitos and Cidadao.objects.filter(cns=digitos).exclude(pk=self.instance.pk).exists():
            raise serializers.ValidationError("Este CNS já está cadastrado para outro cidadão.")
        return digitos or None


class CidadaoProntuarioSerializer(serializers.ModelSerializer):
    sexo_display = serializers.CharField(source="get_sexo_display", read_only=True)

    class Meta:
        model = Cidadao
        fields = [
            "id",
            "nome",
            "cpf",
            "cns",
            "data_nascimento",
            "sexo",
            "sexo_display",
            "telefone",
            "alergias",
            "condicoes_cronicas",
        ]
