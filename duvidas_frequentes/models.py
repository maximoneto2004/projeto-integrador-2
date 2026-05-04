from django.db import models
from app.models import BaseModel


class Duvida(BaseModel):
    pergunta = models.CharField(verbose_name='Pergunta', max_length=300)
    resposta = models.CharField(verbose_name='Resposta', max_length=1000)

    class Meta:
        verbose_name = 'Dúvida Frequente'
        verbose_name_plural = 'Dúvidas Frequentes'
    
    def __str__(self):
        return self.pergunta
