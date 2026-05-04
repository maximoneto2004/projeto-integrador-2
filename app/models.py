from django.db import models
from .mixins import BaseModel

class Bairro(BaseModel):
    nome = models.CharField(verbose_name='Nome', max_length=50)

    class Meta:
        verbose_name = 'Bairro'
        verbose_name_plural = 'Bairros'
        ordering = ['nome']

    def __str__(self):
        return self.nome

