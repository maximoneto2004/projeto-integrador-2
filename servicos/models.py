from django.db import models
from app.mixins import BaseModel
from app.static_data import TIPO_MARCACAO_CHOICES


class ClasseServico(BaseModel):
    nome = models.CharField(max_length=100, verbose_name='Nome', unique=True)
    descricao = models.TextField(verbose_name='Descrição', blank=True, null=True, max_length=600)

    class Meta:
        verbose_name = "Classe de Serviço"
        verbose_name_plural = "Classes de Serviço"

    def __str__(self):
        return self.nome


class TipoServico(BaseModel):
    nome = models.CharField(max_length=100, verbose_name='Nome', unique=True)
    descricao = models.TextField(verbose_name='Descrição', blank=True, null=True, max_length=600)
    tempo_atendimento = models.PositiveIntegerField(
        default=20,
        verbose_name="Tempo de Atendimento (minutos)"
    )

    class Meta:
        verbose_name = "Tipo de Serviço"
        verbose_name_plural = "Tipos de Serviço"

    def __str__(self):
        return self.nome


class Servico(BaseModel):
    nome = models.CharField(max_length=150, verbose_name="Nome do Serviço", unique=True)
    descricao = models.TextField(verbose_name='Descrição', blank=True, null=True, max_length=600)
    classe = models.ForeignKey(ClasseServico, on_delete=models.PROTECT,verbose_name="Classe/Grupo do Serviço")
    tipo_servico = models.ForeignKey(
        TipoServico,
        on_delete=models.PROTECT,
        verbose_name="Tipo de Serviço"
    )
    tipo_marcacao = models.CharField(
        max_length=20,
        choices=TIPO_MARCACAO_CHOICES,
        default="AGENDAMENTO"
    )
    # tempo_atendimento = models.PositiveIntegerField(
    #     default=20,
    #     verbose_name="Tempo de Atendimento (minutos)"
    # )

    class Meta:
        verbose_name = "Serviço"
        verbose_name_plural = "Serviços"

    def __str__(self):
        return self.nome