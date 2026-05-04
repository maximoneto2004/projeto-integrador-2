from django.db import models
from app.mixins import BaseModel
from unidade_cras.models import UnidadeCras
from prontuario.models import FormaIngresso, OrgaoOrigemEncaminhamento, Prontuario, Parentesco, Unidade
from cidadaos.models import Cidadao
from app.static_data import LOCALIZACAO_DOMICILIO_CHOICES, ESCOLARIDADE_CHOICES
from app.models import Bairro


class MembroFamiliar(BaseModel):
    cidadao = models.ForeignKey(Cidadao, verbose_name='Membro', on_delete=models.PROTECT)
    parentesco = models.ForeignKey(Parentesco, verbose_name="Parentesco", on_delete=models.PROTECT, null=True, blank=True)
    escolaridade = models.CharField(verbose_name='Escolaridade', max_length=100, choices=ESCOLARIDADE_CHOICES, null=True, blank=True)
    ocupacao = models.CharField(verbose_name='Ocupação', max_length=100, null=True, blank=True)
    renda = models.DecimalField(verbose_name='Renda', max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        verbose_name = 'Membro Famíliar'
        verbose_name_plural = 'Membros Famíliar'

    def __str__(self):
        return self.cidadao.nome


class FichaAtendimentoFamiliar(BaseModel):
    inscricao = models.CharField(verbose_name="Inscrição da Família", unique=True, max_length=200)
    unidade_de_atendimento = models.ForeignKey(
        UnidadeCras, verbose_name="Unidade de Atendimento", on_delete=models.PROTECT
    )
    forma_ingresso = models.ForeignKey(FormaIngresso, verbose_name='Forma de ingresso na unidade', on_delete=models.PROTECT, null=True)
    unidade = models.ForeignKey(Unidade, verbose_name="Orgão/Unidade", on_delete=models.PROTECT, null=True, blank=True)
    contato = models.CharField(verbose_name='Contato', help_text='Telefone ou e-mail', max_length=250, null=True, blank=True)
    prontuario = models.ForeignKey(Prontuario, verbose_name='Nº Prontuário SUAS', null=True, blank=True, on_delete=models.PROTECT)
    responsavel = models.ForeignKey(Cidadao, verbose_name='Identificação do Responsável', on_delete=models.PROTECT, null=True)

    logradouro = models.CharField(
        verbose_name="Logradouro", max_length=200, null=True, blank=True
    )
    numero = models.CharField(
        verbose_name="Número", max_length=10, null=True, blank=True
    )
    bairro = models.ForeignKey(
        Bairro, verbose_name="Bairro", on_delete=models.PROTECT, null=True, blank=True
    )
    cep = models.CharField(verbose_name="CEP", max_length=10, null=True, blank=True)
    complemento = models.CharField(
        verbose_name="Complemento", max_length=150, blank=True, null=True
    )
    estado = models.CharField(
        verbose_name="Estado", max_length=50, null=True, blank=True
    )
    cidade = models.CharField(
        verbose_name="Cidade", max_length=50, null=True, blank=True
    )
    ponto_referencia = models.CharField(
        verbose_name="Ponto de Referência", max_length=150, null=True, blank=True
    )
    localizacao = models.CharField(
        verbose_name="Localização do Domicílio",
        max_length=50,
        choices=LOCALIZACAO_DOMICILIO_CHOICES,
        null=True,
        blank=True,
    )
    abrigo = models.BooleanField(
        verbose_name="Endereço é de um Abrigo", null=True, blank=True
    )

    membro_familiar = models.ForeignKey(MembroFamiliar, verbose_name='Membro Famíliar', on_delete=models.PROTECT, null=True, blank=True)   

    demanda_apresentada = models.TextField(verbose_name='Demanda Apresentada', null=True, blank=True, help_text='Descreva a demanda relatada pela família', max_length=600) 
    observacao = models.TextField(verbose_name='Observações e evolução dos atendimentos', null=True, blank=True, help_text='Use este campo para registrar evoluções, datas e assinaturas', max_length=600)
    

    class Meta:
        verbose_name = 'Ficha de Atendimento Famíliar'
        verbose_name_plural = 'Fichas de Atendimento Famíliar'

    def __str__(self):
        return self.inscricao
    

