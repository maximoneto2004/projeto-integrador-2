from django.db import models

from app.mixins import BaseModel
from app.static_data import (
    FORMA_FARMACEUTICA_CHOICES,
    UNIDADE_MEDIDA_CHOICES,
    VIA_ADMINISTRACAO_CHOICES,
)


class Medicamento(BaseModel):
    nome = models.CharField(verbose_name="Nome", max_length=200)
    principio_ativo = models.CharField(verbose_name="Princípio Ativo", max_length=200)
    forma_farmaceutica = models.CharField(
        verbose_name="Forma Farmacêutica", max_length=30, choices=FORMA_FARMACEUTICA_CHOICES
    )
    concentracao = models.CharField(
        verbose_name="Dosagem/Concentração", max_length=50, help_text="Ex.: 500, 10, 2,5"
    )
    unidade_medida = models.CharField(
        verbose_name="Unidade de Medida", max_length=20, choices=UNIDADE_MEDIDA_CHOICES
    )
    via_administracao = models.CharField(
        verbose_name="Via de Administração", max_length=30, choices=VIA_ADMINISTRACAO_CHOICES
    )
    controlado = models.BooleanField(verbose_name="Controlado", default=False)
    classe_terapeutica = models.CharField(
        verbose_name="Classe Terapêutica", max_length=150, blank=True, null=True
    )
    fabricante = models.CharField(verbose_name="Fabricante", max_length=150, blank=True, null=True)
    codigo_registro = models.CharField(
        verbose_name="Código/Registro ANVISA", max_length=50, blank=True, null=True, unique=True
    )
    observacoes = models.TextField(verbose_name="Observações", blank=True, null=True, max_length=600)

    class Meta:
        verbose_name = "Medicamento"
        verbose_name_plural = "Medicamentos"
        ordering = ["nome", "concentracao"]
        constraints = [
            models.UniqueConstraint(
                fields=["nome", "concentracao", "unidade_medida", "forma_farmaceutica"],
                name="medicamento_apresentacao_unica",
            )
        ]

    def __str__(self):
        return f"{self.nome} {self.concentracao} {self.get_unidade_medida_display()} ({self.get_forma_farmaceutica_display()})"
