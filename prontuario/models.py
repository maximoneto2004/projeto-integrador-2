from datetime import timedelta
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MaxValueValidator, MinValueValidator, RegexValidator
from django.db import models
from django.utils import timezone

from app.mixins import BaseModel
from app.static_data import (
    CLASSIFICACAO_RISCO_CHOICES,
    STATUS_DISPENSACAO_CHOICES,
    STATUS_DISPENSACAO_DISPENSADO,
    STATUS_DISPENSACAO_PARCIAL,
    STATUS_DISPENSACAO_PENDENTE,
)
from cidadaos.models import Cidadao
from unidade_posto.models import UnidadePosto
from usuarios.models import Usuario


class Receita(BaseModel):
    agendamento = models.ForeignKey(
        "agendamentos.Agendamento",
        verbose_name="Agendamento",
        on_delete=models.PROTECT,
        related_name="receitas",
    )
    cidadao = models.ForeignKey(
        Cidadao,
        verbose_name="Cidadão",
        on_delete=models.PROTECT,
        related_name="receitas",
    )
    profissional = models.ForeignKey(
        Usuario,
        verbose_name="Profissional",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="receitas_emitidas",
    )
    data_emissao = models.DateTimeField(verbose_name="Data de Emissão", auto_now_add=True)
    diagnostico = models.TextField(verbose_name="Diagnóstico", null=True, blank=True, max_length=600)
    observacoes = models.TextField(verbose_name="Observações", null=True, blank=True, max_length=600)
    validade_dias = models.PositiveSmallIntegerField(
        verbose_name="Validade (dias)",
        default=30,
        validators=[MinValueValidator(1), MaxValueValidator(365)],
    )
    data_validade = models.DateField(verbose_name="Válida até", null=True, blank=True, editable=False)

    class Meta:
        verbose_name = "Receita"
        verbose_name_plural = "Receitas"
        ordering = ["-data_emissao"]

    def __str__(self):
        return f"Receita {self.id} - {self.cidadao.nome}"

    def save(self, *args, **kwargs):
        emissao = timezone.localtime(self.data_emissao).date() if self.data_emissao else timezone.localdate()
        self.data_validade = emissao + timedelta(days=self.validade_dias)
        super().save(*args, **kwargs)

    @property
    def vencida(self):
        return self.data_validade is not None and self.data_validade < timezone.localdate()

    @property
    def possui_dispensacao(self):
        return self.medicamentos.filter(quantidade_dispensada__gt=0).exists()


class ReceitaMedicamento(BaseModel):
    receita = models.ForeignKey(
        Receita,
        verbose_name="Receita",
        on_delete=models.CASCADE,
        related_name="medicamentos",
    )
    # Nulo apenas em itens legados, prescritos em texto livre antes do cadastro de medicamentos.
    medicamento = models.ForeignKey(
        "medicamentos.Medicamento",
        verbose_name="Medicamento",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="itens_receita",
    )
    # Retrato do medicamento no momento da prescrição; preserva o histórico se o cadastro mudar.
    nome = models.CharField(verbose_name="Descrição do Medicamento", max_length=200)
    dosagem = models.CharField(verbose_name="Dosagem", max_length=100)
    frequencia = models.CharField(verbose_name="Frequência", max_length=100)
    duracao = models.CharField(verbose_name="Duração", max_length=100)
    instrucoes = models.TextField(verbose_name="Instruções", null=True, blank=True, max_length=600)
    quantidade_prescrita = models.PositiveIntegerField(
        verbose_name="Quantidade Prescrita",
        null=True,
        blank=True,
        help_text="Em unidades de dispensação (comprimidos, frascos...). Nulo em itens legados.",
    )
    quantidade_dispensada = models.PositiveIntegerField(verbose_name="Quantidade Dispensada", default=0)
    status_dispensacao = models.CharField(
        verbose_name="Status da Dispensação",
        max_length=20,
        choices=STATUS_DISPENSACAO_CHOICES,
        default=STATUS_DISPENSACAO_PENDENTE,
    )

    class Meta:
        verbose_name = "Medicamento da Receita"
        verbose_name_plural = "Medicamentos da Receita"

    def __str__(self):
        return f"{self.nome} - {self.dosagem}"

    @property
    def quantidade_restante(self):
        if self.quantidade_prescrita is None:
            return 0
        return max(self.quantidade_prescrita - self.quantidade_dispensada, 0)

    def registrar_dispensacao(self, quantidade):
        self.quantidade_dispensada += quantidade
        if self.quantidade_dispensada >= (self.quantidade_prescrita or 0):
            self.status_dispensacao = STATUS_DISPENSACAO_DISPENSADO
        else:
            self.status_dispensacao = STATUS_DISPENSACAO_PARCIAL
        self.save(update_fields=["quantidade_dispensada", "status_dispensacao", "updated_at"])


def _faixa(minimo, maximo):
    return [MinValueValidator(minimo), MaxValueValidator(maximo)]


class RegistroAtendimento(BaseModel):
    """Registro clínico de um atendimento (formato SOAP), um por agendamento."""

    agendamento = models.OneToOneField(
        "agendamentos.Agendamento",
        verbose_name="Agendamento",
        on_delete=models.PROTECT,
        related_name="registro_atendimento",
    )
    cidadao = models.ForeignKey(
        Cidadao, verbose_name="Cidadão", on_delete=models.PROTECT, related_name="registros_atendimento"
    )
    unidade = models.ForeignKey(
        UnidadePosto, verbose_name="Unidade", on_delete=models.PROTECT, related_name="registros_atendimento"
    )
    profissional = models.ForeignKey(
        Usuario, verbose_name="Profissional", on_delete=models.PROTECT, related_name="registros_atendimento"
    )

    classificacao_risco = models.CharField(
        verbose_name="Classificação de Risco", max_length=20, choices=CLASSIFICACAO_RISCO_CHOICES, blank=True, null=True
    )
    queixa_principal = models.TextField(verbose_name="Queixa Principal", max_length=600)
    subjetivo = models.TextField(verbose_name="Subjetivo (história)", blank=True, null=True, max_length=4000)
    objetivo = models.TextField(verbose_name="Objetivo (exame físico)", blank=True, null=True, max_length=4000)
    avaliacao = models.TextField(verbose_name="Avaliação", blank=True, null=True, max_length=4000)
    cid = models.CharField(
        verbose_name="CID-10",
        max_length=6,
        blank=True,
        null=True,
        validators=[RegexValidator(r"^[A-Z][0-9]{2}(\.[0-9A-Z]{1,2})?$", "Informe um CID-10 válido, ex.: J06.9")],
    )
    plano = models.TextField(verbose_name="Plano / Conduta", blank=True, null=True, max_length=4000)

    pressao_sistolica = models.PositiveSmallIntegerField("PA sistólica (mmHg)", null=True, blank=True, validators=_faixa(40, 300))
    pressao_diastolica = models.PositiveSmallIntegerField("PA diastólica (mmHg)", null=True, blank=True, validators=_faixa(20, 200))
    frequencia_cardiaca = models.PositiveSmallIntegerField("Frequência cardíaca (bpm)", null=True, blank=True, validators=_faixa(20, 250))
    frequencia_respiratoria = models.PositiveSmallIntegerField("Frequência respiratória (irpm)", null=True, blank=True, validators=_faixa(5, 80))
    temperatura = models.DecimalField(
        "Temperatura (°C)", max_digits=3, decimal_places=1, null=True, blank=True,
        validators=_faixa(Decimal("30.0"), Decimal("45.0")),
    )
    saturacao_o2 = models.PositiveSmallIntegerField("Saturação de O₂ (%)", null=True, blank=True, validators=_faixa(50, 100))
    glicemia_capilar = models.PositiveSmallIntegerField("Glicemia capilar (mg/dL)", null=True, blank=True, validators=_faixa(10, 1000))
    peso = models.DecimalField(
        "Peso (kg)", max_digits=5, decimal_places=2, null=True, blank=True,
        validators=_faixa(Decimal("0.3"), Decimal("400")),
    )
    altura = models.PositiveSmallIntegerField("Altura (cm)", null=True, blank=True, validators=_faixa(20, 250))

    class Meta:
        verbose_name = "Registro de Atendimento"
        verbose_name_plural = "Registros de Atendimento"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Atendimento de {self.cidadao} em {timezone.localtime(self.created_at):%d/%m/%Y}" if self.created_at else "Atendimento"

    def clean(self):
        super().clean()
        if (self.pressao_sistolica is None) != (self.pressao_diastolica is None):
            raise ValidationError({"pressao_diastolica": "Informe a pressão sistólica e a diastólica juntas."})
        if self.pressao_sistolica is not None and self.pressao_sistolica <= self.pressao_diastolica:
            raise ValidationError({"pressao_sistolica": "A pressão sistólica deve ser maior que a diastólica."})

    @property
    def imc(self):
        if not self.peso or not self.altura:
            return None
        altura_m = Decimal(self.altura) / 100
        return round(self.peso / (altura_m * altura_m), 1)
