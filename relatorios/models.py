from django.core.exceptions import ValidationError
from django.db import models

from app.mixins import BaseModel
from servicos.models import Servico


class ConfiguracaoRelatorioAtendimentosTecnico(BaseModel):
    nome = models.CharField(max_length=100, unique=True, verbose_name="Nome")
    familias_grupos = models.ForeignKey(
        Servico,
        blank=True,
        null=True,
        on_delete=models.PROTECT,
        related_name="configuracoes_relatorio_familias_grupos",
        verbose_name="Famílias participando de grupos",
    )
    servicos_adicionais = models.ManyToManyField(
        Servico,
        blank=True,
        related_name="configuracoes_relatorio_servicos_adicionais",
        verbose_name="Serviços adicionais selecionados",
    )
    servicos_adicionais_agrupados = models.ManyToManyField(
        Servico,
        blank=True,
        related_name="configuracoes_relatorio_servicos_agrupados",
        verbose_name="Serviços adicionais agrupados",
    )
    servicos_adicionais_pcd = models.ManyToManyField(
        Servico,
        blank=True,
        related_name="configuracoes_relatorio_servicos_pcd",
        verbose_name="Serviços adicionais para PCD",
    )
    servico_adicional_faixa_etaria = models.ForeignKey(
        Servico,
        blank=True,
        null=True,
        on_delete=models.SET_NULL,
        related_name="configuracoes_relatorio_faixa_etaria",
        verbose_name="Serviço adicional para faixa etaria",
    )

    class Meta:
        verbose_name = "Configuração do relatorio de atendimentos tecnico"
        verbose_name_plural = "Configurações do relatorio de atendimentos tecnico"

    def __str__(self):
        return self.nome


class ConfiguracaoRelatorioAtividadesCadunico(BaseModel):
    nome = models.CharField(max_length=100, unique=True, verbose_name="Nome")
    cadastro_unico = models.ManyToManyField(
        Servico,
        blank=True,
        related_name="configuracoes_relatorio_atividades_cadastro_unico",
        verbose_name="Serviços de cadastro unico",
    )
    bolsa_familia = models.ManyToManyField(
        Servico,
        blank=True,
        related_name="configuracoes_relatorio_atividades_bolsa_familia",
        verbose_name="Serviços de bolsa familia",
    )

    class Meta:
        verbose_name = "Configurção do relatorio de atividades cadunico"
        verbose_name_plural = "Configurações do relatorio de atividades cadunico"

    def __str__(self):
        return self.nome

    def clean(self):
        super().clean()
        queryset = ConfiguracaoRelatorioAtividadesCadunico.objects.all()
        if self.pk:
            queryset = queryset.exclude(pk=self.pk)
        if queryset.exists():
            raise ValidationError(
                "Já existe uma configuração de relatório de atividades CadÚnico cadastrada."
            )

    def save(self, *args, **kwargs):
        self.full_clean()
        return super().save(*args, **kwargs)
