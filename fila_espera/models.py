from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone
from app.mixins import BaseModel
from cidadaos.models import Cidadao
from servicos.models import Servico
from agendamentos.models import Agendamento
from app.static_data import PRIORIDADE_CHOICES, SITUACAO_AGENDAMENTO_CHOICES, URGENCIA_ATENDIMENTO_CHOICES
from unidade_cras.models import UnidadeCras


class FilaEspera(BaseModel):
    cidadao = models.ForeignKey(Cidadao, verbose_name="Cidadão", on_delete=models.PROTECT)
    servico = models.ForeignKey(Servico, verbose_name='Serviço', on_delete=models.PROTECT)
    unidade = models.ForeignKey(UnidadeCras, verbose_name='Unidade Cras', on_delete=models.PROTECT)
    prioridade = models.CharField(verbose_name='Prioridade', choices=PRIORIDADE_CHOICES, max_length=50)
    status = models.CharField(verbose_name='Status', choices=SITUACAO_AGENDAMENTO_CHOICES, max_length=50, default='AGUARDANDO_FILA')
    urgencia = models.CharField(verbose_name='Urgência do atendimento', choices=URGENCIA_ATENDIMENTO_CHOICES, default="NORMAL", max_length=50)

    class Meta:
        verbose_name = "Fila de Espera"
        verbose_name = "Filas de Espera"

    def clean(self):
        super().clean()
        if not self.cidadao_id:
            return

        if self.servico_id and Agendamento.possui_ativo_por_tipo(
            cidadao=self.cidadao,
            tipo_servico=self.servico.tipo_servico,
        ):
            raise ValidationError(
                {
                    "result": "Cidadão já possui um agendamento ativo deste tipo e não pode entrar na fila de espera."
                }
            )

        dia_referencia = (
            self.created_at.date() if self.created_at else timezone.localdate()
        )
        existe_fila = (
            FilaEspera.objects.filter(
                cidadao=self.cidadao,
                created_at__date=dia_referencia,
            )
            .exclude(pk=self.pk)
            .exists()
        )
        if existe_fila:
            raise ValidationError(
                {"result": "Cidadão ja está em uma fila neste dia."}
            )

    def __str__(self):
        return f" {self.cidadao} - {self.unidade}"

    @classmethod
    def limpar_fila_do_dia(cls, data=None):
        dia = data or timezone.localdate()
        total, _ = cls.objects.filter(created_at__date=dia).delete()
        return total
