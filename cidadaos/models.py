from django.db import models
from app.mixins import BaseModel
from app.validators import validate_CPF
from app.static_data import SEXO_CHOICES, ORIGEM_CHOICES, SIGLA_ESTADO_CHOICES
from app.models import Bairro
import re
from unidade_cras.models import UnidadeCras


def normalize_nome(value):
    if value is None:
        return value

    text = str(value).strip()
    if not text:
        return text

    lower_words = {"da", "de", "do", "das", "dos", "e"}
    parts = []
    for part in text.split():
        lowered = part.lower()
        if lowered in lower_words:
            parts.append(lowered)
        else:
            parts.append(lowered.capitalize())
    return " ".join(parts)


class Cidadao(BaseModel):
    nome = models.CharField(verbose_name="Nome", max_length=150)
    apelido = models.CharField(verbose_name="Apelido (caso seja relevante)", max_length=150, null=True, blank=True)
    cpf = models.CharField(verbose_name="CPF", max_length=14, validators=[validate_CPF], unique=True)
    email = models.EmailField(verbose_name="E-mail", null=True, blank=True, unique=True)
    telefone = models.CharField(verbose_name="Telefone", max_length=15, null=True, blank=True)
    mae = models.CharField(verbose_name="Nome da mãe", max_length=250, null=True, blank=True)
    data_nascimento = models.DateField(verbose_name="Data de Nascimento", null=True, blank=True)
    nis = models.CharField(verbose_name='NIS', max_length=150, null=True, blank=True)
    rg = models.CharField(verbose_name="RG", max_length=150, null=True, blank=True)
    uf_rg = models.CharField(verbose_name="UF do RG", max_length=2, null=True, blank=True, choices=SIGLA_ESTADO_CHOICES)
    orgao_emissor = models.CharField(verbose_name="Orgão Emissor", max_length=10, null=True, blank=True)
    data_emissao_rg = models.DateField(verbose_name="Data de Emissão do RG", null=True, blank=True)
    sexo = models.CharField(verbose_name="Sexo", max_length=20, choices=SEXO_CHOICES, null=True, blank=True)
    logradouro = models.CharField(verbose_name="Logradouro", max_length=200, blank=True)
    numero = models.CharField(verbose_name="Número", max_length=10, blank=True)
    bairro = models.ForeignKey(Bairro, verbose_name="Bairro", on_delete=models.PROTECT, null=True, blank=True)
    cep = models.CharField(verbose_name="CEP", max_length=10, blank=True)
    complemento = models.CharField(verbose_name="Complemento", max_length=150, blank=True, null=True)
    origem = models.CharField(verbose_name='Origem do agendamento', choices=ORIGEM_CHOICES, max_length=50, null=True, blank=True)
    unidade_origem = models.ForeignKey(UnidadeCras, verbose_name="Unidade Cras de acompanhamento", null=True, on_delete=models.PROTECT)


    class Meta:
        verbose_name = "Cidadão"
        verbose_name_plural = "Cidadãos"

    def save(self, *args, **kwargs):
        if self.nome:
            self.nome = normalize_nome(self.nome)
        if self.cpf:
            self.cpf = re.sub(r"\D", "", self.cpf)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.nome
