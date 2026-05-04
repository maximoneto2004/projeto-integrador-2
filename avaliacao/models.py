from django.db import models
from django.core.exceptions import ValidationError
from app.models import BaseModel
from agendamentos.models import Agendamento
from django.core.validators import MinValueValidator, MaxValueValidator


class Avaliacao(BaseModel):
    agendamento = models.ForeignKey(Agendamento, verbose_name='Agendamento', on_delete=models.PROTECT,limit_choices_to={"situacao": "FINALIZADO"},)
    nota = models.IntegerField(verbose_name='Nota', validators=[MinValueValidator(1), MaxValueValidator(5)])
    comentario = models.TextField(verbose_name="Comentário", null=True, blank=True, max_length=600)

    class Meta:
        verbose_name = 'Avaliação'
        verbose_name_plural = 'Avaliações'
    
    def __str__(self):
        return f"{self.agendamento} - {self.nota}"