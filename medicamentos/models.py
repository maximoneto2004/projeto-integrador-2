from django.conf import settings
from django.db import models
from django.utils import timezone

from app.mixins import BaseModel
from app.static_data import (
    FORMA_FARMACEUTICA_CHOICES,
    TIPO_MOVIMENTACAO_CHOICES,
    UNIDADE_MEDIDA_CHOICES,
    VIA_ADMINISTRACAO_CHOICES,
)
from unidade_posto.models import UnidadePosto


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
    estoque_minimo = models.PositiveIntegerField(
        verbose_name="Estoque Mínimo por Unidade",
        default=0,
        help_text="Quantidade mínima (em unidades de dispensação) esperada em cada posto. 0 desativa o alerta.",
    )

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


class LoteMedicamento(BaseModel):
    medicamento = models.ForeignKey(
        Medicamento, verbose_name="Medicamento", on_delete=models.PROTECT, related_name="lotes"
    )
    unidade = models.ForeignKey(
        UnidadePosto, verbose_name="Unidade", on_delete=models.PROTECT, related_name="lotes_medicamento"
    )
    numero_lote = models.CharField(verbose_name="Número do Lote", max_length=50)
    validade = models.DateField(verbose_name="Validade")
    quantidade_inicial = models.PositiveIntegerField(verbose_name="Quantidade Inicial")
    # Só deve ser alterada pelos serviços de estoque, que registram a MovimentacaoEstoque correspondente.
    quantidade_atual = models.PositiveIntegerField(verbose_name="Quantidade Atual", default=0)
    fornecedor = models.CharField(verbose_name="Fornecedor", max_length=150, blank=True, null=True)
    data_entrada = models.DateField(verbose_name="Data de Entrada", default=timezone.localdate)

    class Meta:
        verbose_name = "Lote de Medicamento"
        verbose_name_plural = "Lotes de Medicamento"
        ordering = ["validade", "data_entrada"]
        constraints = [
            models.UniqueConstraint(
                fields=["medicamento", "unidade", "numero_lote"],
                name="lote_unico_por_medicamento_unidade",
            )
        ]

    def __str__(self):
        return f"{self.medicamento} - lote {self.numero_lote} ({self.unidade})"

    @property
    def vencido(self):
        return self.validade < timezone.localdate()


class MovimentacaoEstoque(BaseModel):
    lote = models.ForeignKey(
        LoteMedicamento, verbose_name="Lote", on_delete=models.PROTECT, related_name="movimentacoes"
    )
    tipo = models.CharField(verbose_name="Tipo", max_length=20, choices=TIPO_MOVIMENTACAO_CHOICES)
    quantidade = models.IntegerField(
        verbose_name="Quantidade",
        help_text="Efeito no saldo do lote: positivo para entradas, negativo para saídas e perdas.",
    )
    saldo_apos = models.PositiveIntegerField(verbose_name="Saldo do Lote Após a Movimentação")
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="Responsável",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="movimentacoes_estoque",
    )
    data = models.DateTimeField(verbose_name="Data", default=timezone.now)
    motivo = models.TextField(verbose_name="Motivo", blank=True, null=True, max_length=600)
    receita_item = models.ForeignKey(
        "prontuario.ReceitaMedicamento",
        verbose_name="Item de Receita Dispensado",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="dispensacoes",
    )

    class Meta:
        verbose_name = "Movimentação de Estoque"
        verbose_name_plural = "Movimentações de Estoque"
        ordering = ["-data"]

    def __str__(self):
        return f"{self.get_tipo_display()} {self.quantidade:+d} - {self.lote}"
