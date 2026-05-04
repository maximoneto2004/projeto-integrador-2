from django.contrib.auth.models import AbstractUser
from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator
from django.db import models
import re

from app.mixins import BaseModel
from app.static_data import DIA_SEMANA_CHOICES
from app.validators import validate_CPF
from servicos.models import Servico, TipoServico
from unidade_cras.models import Guiche, UnidadeCras


class Usuario(AbstractUser, BaseModel):
    email = models.EmailField(verbose_name="Email", unique=True)
    nome_completo = models.CharField(verbose_name="Nome Completo", max_length=150)
    cpf = models.CharField(
        verbose_name="CPF", max_length=14, validators=[validate_CPF], unique=True
    )
    telefone = models.CharField(
        verbose_name="Telefone",
        max_length=15,
        validators=[RegexValidator(r"^\d{10,15}$")],
    )
    unidades_lotacao = models.ManyToManyField(
        UnidadeCras, verbose_name="Unidade Cras", blank=True
    )
    tipo_ofertados = models.ManyToManyField(
        TipoServico, verbose_name="Tipo de Serviço", blank=True
    )
    guiche_atual = models.ForeignKey(
        Guiche,
        verbose_name="Guichê/Sala atual",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        help_text="Informe o posto de atendimento em que o atendente está no momento.",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username", "nome_completo", "cpf", "telefone"]

    def __str__(self):
        return f"{self.nome_completo} ({self.email})"

    def save(self, *args, **kwargs):
        if self.cpf:
            self.cpf = re.sub(r"\D", "", self.cpf)
        self.full_clean()
        if not self.username:
            self.username = self.email
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        if (
            self.guiche_atual
            and self.guiche_atual.unidade not in self.unidades_lotacao.all()
        ):
            raise ValidationError(
                f"O guichê '{self.guiche_atual}' pertence à unidade '{self.guiche_atual.unidade.nome}', "
                "que não está entre as unidades de lotação deste usuário."
            )


class EscalaTrabalho(BaseModel):
    profissional = models.ForeignKey(
        Usuario, on_delete=models.PROTECT, related_name="escalas"
    )

    unidade = models.ForeignKey(
        UnidadeCras, on_delete=models.PROTECT, related_name="escalas"
    )

    dias_semana = models.JSONField(
        verbose_name="Dias da Semana",
        help_text="Selecione um ou mais dias da semana",
        default=list,
    )

    turno1_inicio = models.TimeField(null=True, blank=True)
    turno1_fim = models.TimeField(null=True, blank=True)

    turno2_inicio = models.TimeField(null=True, blank=True)
    turno2_fim = models.TimeField(null=True, blank=True)

    def __str__(self):
        nomes = dict(DIA_SEMANA_CHOICES)
        dias_legiveis = ", ".join([nomes.get(d, d) for d in self.dias_semana])
        return (
            f"{self.profissional.nome_completo} - {self.unidade.nome} ({dias_legiveis})"
        )

    def clean(self):
        super().clean()
        if not self.dias_semana:
            raise ValidationError("Informe ao menos um dia da semana.")

        if self.unidade not in self.profissional.unidades_lotacao.all():
            raise ValidationError(
                f"O profissional '{self.profissional.nome_completo}' "
                f"não está lotado na unidade '{self.unidade.nome}' "
                f"e portanto não pode ser escalado nela."
            )

        if self.turno1_inicio and not self.turno1_fim:
            raise ValidationError("Informe o horário final do turno 1.")

        if self.turno1_fim and not self.turno1_inicio:
            raise ValidationError("Informe o horário inicial do turno 1.")

        if self.turno2_inicio and not self.turno2_fim:
            raise ValidationError("Informe o horário final do turno 2.")

        if self.turno2_fim and not self.turno2_inicio:
            raise ValidationError("Informe o horário inicial do turno 2.")

        if self.turno1_inicio and self.turno1_fim:
            if self.turno1_fim <= self.turno1_inicio:
                raise ValidationError(
                    "O horário final do turno 1 deve ser maior que o inicial."
                )

        if self.turno2_inicio and self.turno2_fim:
            if self.turno2_fim <= self.turno2_inicio:
                raise ValidationError(
                    "O horário final do turno 2 deve ser maior que o inicial."
                )

        if self.turno1_fim and self.turno2_inicio:
            if self.turno2_inicio < self.turno1_fim:
                raise ValidationError(
                    "O turno 2 não pode começar antes do fim do turno 1."
                )

        outras = EscalaTrabalho.objects.filter(
            profissional=self.profissional, is_active=True
        ).exclude(id=self.id)

        for escala in outras:
            dias_em_comum = set(self.dias_semana).intersection(escala.dias_semana)

            if not dias_em_comum:
                continue

            raise ValidationError(
                f"Já existe escala ativa para {', '.join(dias_em_comum)}."
            )

            if (
                self.turno1_inicio
                and self.turno1_fim
                and escala.turno1_inicio
                and escala.turno1_fim
            ):

                if (
                    self.turno1_inicio < escala.turno1_fim
                    and self.turno1_fim > escala.turno1_inicio
                ):
                    raise ValidationError(
                        f"Conflito de Turno 1 no(s) dia(s): {', '.join(dias_em_comum)}."
                    )

            if (
                self.turno2_inicio
                and self.turno2_fim
                and escala.turno2_inicio
                and escala.turno2_fim
            ):

                if (
                    self.turno2_inicio < escala.turno2_fim
                    and self.turno2_fim > escala.turno2_inicio
                ):
                    raise ValidationError(
                        f"Conflito de Turno 2 no(s) dia(s): {', '.join(dias_em_comum)}."
                    )

            if (
                self.turno1_inicio
                and self.turno1_fim
                and escala.turno2_inicio
                and escala.turno2_fim
            ):

                if (
                    self.turno1_inicio < escala.turno2_fim
                    and self.turno1_fim > escala.turno2_inicio
                ):
                    raise ValidationError(
                        f"Conflito entre Turno 1 e Turno 2 no(s) dia(s): {', '.join(dias_em_comum)}."
                    )

            if (
                self.turno2_inicio
                and self.turno2_fim
                and escala.turno1_inicio
                and escala.turno1_fim
            ):

                if (
                    self.turno2_inicio < escala.turno1_fim
                    and self.turno2_fim > escala.turno1_inicio
                ):
                    raise ValidationError(
                        f"Conflito entre Turno 2 e Turno 1 no(s) dia(s): {', '.join(dias_em_comum)}."
                    )
