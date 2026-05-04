from django.db import models
from app.mixins import BaseModel
from app.models import Bairro
from app.static_data import DIA_SEMANA_CHOICES
from servicos.models import Servico
from django.core.exceptions import ValidationError
from django.conf import settings




class UnidadeCras(BaseModel):
    nome = models.CharField(verbose_name='Nome', max_length=150, unique=True)
    logradouro = models.CharField(verbose_name='Logradouro', max_length=150)
    numero = models.CharField(verbose_name='Número', max_length=10)
    complemento = models.CharField(verbose_name='Complemento', max_length=150, blank=True, null=True)
    cep = models.CharField(verbose_name='CEP', max_length=10)
    bairro = models.ForeignKey(Bairro, verbose_name='Bairro', on_delete=models.PROTECT)
    telefone = models.CharField(verbose_name='Telefone', max_length=15)
    email = models.EmailField(verbose_name='Email')

    hora_manha_inicio = models.TimeField(verbose_name='Início Expediente Manhã', null=True)
    hora_manha_fim = models.TimeField(verbose_name='Fim Expediente Manhã', null=True)
    hora_tarde_inicio = models.TimeField(verbose_name='Início Expediente Tarde', blank=True, null=True)
    hora_tarde_fim = models.TimeField(verbose_name='Fim Expediente Tarde', blank=True, null=True)
    bairros_abrangencia = models.ManyToManyField(Bairro, verbose_name="Território de Abrangência", null=True, related_name="bairros_abrangencia")
    latitude = models.CharField(verbose_name="Latitude", max_length=200, null=True, blank=True)
    longitude = models.CharField(verbose_name="Longitude", max_length=200, null=True, blank=True)

    class Meta:
        verbose_name = 'Unidade Cras'
        verbose_name_plural = 'Unidades Cras'
    

    def __str__(self):
        return self.nome


class Guiche(BaseModel):
    unidade = models.ForeignKey(
        UnidadeCras,
        verbose_name='Unidade',
        on_delete=models.CASCADE,
        related_name="guiches"
    )
    nome = models.CharField(max_length=50, verbose_name='Nome')

    def __str__(self):
        return f"{self.unidade.nome} - {self.nome}"



class ServicoUnidadeCras(BaseModel):
    unidade = models.ForeignKey(
        UnidadeCras,
        on_delete=models.CASCADE,
        verbose_name="Unidade CRAS",
        related_name="servicos_unidade"
    )
    servico = models.ForeignKey(
        Servico,
        on_delete=models.PROTECT,
        verbose_name="Serviço",
        related_name="unidades_cras"
    )
    dias_semana = models.JSONField(
        verbose_name="Dias da Semana de Atendimento",
        help_text="Selecione os dias (lista de números de 1 a 7).",
        default=list
    )
    
    mesmo_expediente = models.BooleanField(
        default=False,
        verbose_name="Usar expediente padrão do CRAS"
    )

    hora_manha_inicio = models.TimeField(verbose_name='Início Manhã', blank=True, null=True)
    hora_manha_fim = models.TimeField(verbose_name='Fim Manhã', blank=True, null=True)
    hora_tarde_inicio = models.TimeField(verbose_name='Início Tarde', blank=True, null=True)
    hora_tarde_fim = models.TimeField(verbose_name='Fim Tarde', blank=True, null=True)
    
    class Meta:
        verbose_name = "Serviço por Unidade CRAS"
        verbose_name_plural = "Serviços por Unidade CRAS"

    
    def __str__(self):
        return f"{self.servico.nome} - {self.unidade.nome}"
    

    def clean(self):

        if self.mesmo_expediente:
            return
        
        if not any([self.hora_manha_inicio, self.hora_tarde_inicio]):
            raise ValidationError("Informe pelo menos um horário de atendimento (manhã ou tarde).")

        if self.hora_manha_inicio and self.hora_manha_fim:
            if self.hora_manha_inicio >= self.hora_manha_fim:
                raise ValidationError("Horário da manhã inválido.")

        if self.hora_tarde_inicio and self.hora_tarde_fim:
            if self.hora_tarde_inicio >= self.hora_tarde_fim:
                raise ValidationError("Horário da tarde inválido.")
        
        conflitos = ServicoUnidadeCras.objects.filter(
            unidade=self.unidade,
            servico=self.servico,
            is_active=True
        ).exclude(pk=self.pk)

        for outro in conflitos:
            if set(self.dias_semana).intersection(outro.dias_semana):
                if self.mesmo_expediente or outro.mesmo_expediente:
                    raise ValidationError("Conflito: serviço já configurado com expediente padrão.")
                if self._sobrepoe_horario(outro):
                    raise ValidationError("Conflito de horário: sobreposição detectada.")

    def _sobrepoe_horario(self, outro):
        for inicio1, fim1, inicio2, fim2 in [
            (self.hora_manha_inicio, self.hora_manha_fim, outro.hora_manha_inicio, outro.hora_manha_fim),
            (self.hora_tarde_inicio, self.hora_tarde_fim, outro.hora_tarde_inicio, outro.hora_tarde_fim),
        ]:
            if inicio1 and fim1 and inicio2 and fim2:
                if inicio1 < fim2 and fim1 > inicio2:
                    return True
        return False

    def save(self, *args, **kwargs):
        if self.mesmo_expediente and self.unidade:
            self.hora_manha_inicio = self.unidade.hora_manha_inicio
            self.hora_manha_fim = self.unidade.hora_manha_fim
            self.hora_tarde_inicio = self.unidade.hora_tarde_inicio
            self.hora_tarde_fim = self.unidade.hora_tarde_fim

        super().save(*args, **kwargs)


class BloqueioHorario(BaseModel):
    cras = models.ManyToManyField(
        UnidadeCras,
        verbose_name="Unidades CRAS",
        related_name="bloqueios"
    )
    data = models.DateField(verbose_name="Data do bloqueio")
    data_final = models.DateField(verbose_name="Data final bloqueio", null=True, blank=True)
    hora_inicio = models.TimeField(verbose_name="Horário de início")
    hora_fim = models.TimeField(verbose_name="Horário de término")
    motivo = models.TextField(verbose_name="Motivo do bloqueio", max_length=600)

    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        verbose_name="Criado por",
        related_name="bloqueios_criados"
    )
    alterado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        verbose_name="Alterado por",
        related_name="bloqueios_alterados",
        blank=True, null=True
    )
    justificativa_alteracao = models.TextField(
        verbose_name="Justificativa da alteração/remoção",
        blank=True, null=True, max_length=600
    )

    class Meta:
        verbose_name = "Bloqueio de Horário"
        verbose_name_plural = "Bloqueios de Horários"
        ordering = ["-data", "hora_inicio"]

    def __str__(self):
        cras_names = ", ".join(c.nome for c in self.cras.all()[:3])
        return f"{self.data} ({self.hora_inicio} - {self.hora_fim}) - {cras_names}"

    def clean(self):
        if self.hora_inicio >= self.hora_fim:
            raise ValidationError("O horário de início deve ser anterior ao horário de término.")
        if self.data_final and self.data_final < self.data:
            raise ValidationError("A data final deve ser igual ou posterior a data inicial.")

    def save(self, *args, **kwargs):
        if self.hora_inicio >= self.hora_fim:
            raise ValueError("Horário de início deve ser anterior ao de término.")
        if self.data_final and self.data_final < self.data:
            raise ValueError("Data final deve ser igual ou posterior a data inicial.")
        super().save(*args, **kwargs)

