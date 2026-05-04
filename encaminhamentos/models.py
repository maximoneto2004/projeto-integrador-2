from django.db import models
from django.core.exceptions import ValidationError
from app.mixins import BaseModel
from agendamentos.models import Agendamento


class CodigoArea(BaseModel):
    nome = models.CharField(verbose_name="Nome", max_length=250)
    codigo = models.IntegerField(verbose_name="Código")


    class Meta:
        verbose_name = "Código Área"
        verbose_name_plural = "Códigos Área"

    def __str__(self):
        return f"{self.codigo} - {self.nome}"


class Encaminhamento(BaseModel):
    codigo_area = models.ForeignKey(CodigoArea, verbose_name="Código de área", on_delete=models.PROTECT, related_name="encaminhamentos")
    unidade_origem = models.CharField(verbose_name="Unidade de origem", max_length=255)
    unidade_destino = models.CharField(verbose_name="Unidade de destino", max_length=255)
    agendamento = models.ForeignKey(Agendamento, verbose_name="Agendamento", on_delete=models.PROTECT, related_name="encaminhamentos", unique=True)
    motivo = models.TextField(verbose_name="Motivo")
    resumo = models.TextField(verbose_name="Resumo do acompanhamento", null=True, blank=True)
    profissional = models.CharField(verbose_name="Profissional de referência", max_length=150, null=True, blank=True)
    orientacoes = models.TextField(verbose_name="Orientações para unidade de destino", null=True, blank=True)

    class Meta:
        verbose_name = "Encaminhamento"
        verbose_name_plural = "Encaminhamentos"

    def __str__(self):
        return f"{self.unidade_origem} -> {self.unidade_destino} ({self.codigo_area})"

    def clean(self):
        if self.unidade_origem and self.unidade_destino:
            if self.unidade_origem.strip().lower() == self.unidade_destino.strip().lower():
                raise ValidationError("A unidade de origem deve ser diferente da unidade de destino.")
