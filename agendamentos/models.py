from django.db import models
from django.utils import timezone

from app.mixins import BaseModel
from unidade_cras.models import UnidadeCras
from servicos.models import Servico, TipoServico
from cidadaos.models import Cidadao
from app.static_data import SITUACAO_AGENDAMENTO_CHOICES, ORIGEM_CHOICES, STATUS_FINAL_ATENDIMENTO_CHOICES
from usuarios.models import Usuario


class AgendaVaga(BaseModel):
    unidade = models.ForeignKey(UnidadeCras, verbose_name="Unidade Cras", on_delete=models.PROTECT)
    tipo_servico = models.ForeignKey(TipoServico, verbose_name="Tipo de Serviço", on_delete=models.PROTECT, null=True)
    data = models.DateField(verbose_name="Data")
    horario = models.TimeField(verbose_name="Horário")
    vagas = models.PositiveIntegerField(default=1, verbose_name="Profissionais disponíveis")
    vagas_ocupadas = models.PositiveIntegerField(default=0, verbose_name="Vagas ocupadas")

    class Meta:
        verbose_name = "Agenda Vaga"
        verbose_name_plural = "Agenda Vagas"
        ordering = ["data", "horario"]
        unique_together = ("unidade", "tipo_servico", "data", "horario")

    def __str__(self):
        return f"{self.data} {self.horario} - {self.vagas} vagas - {self.vagas_ocupadas} vagas ocupadas - {self.tipo_servico} tipo serviço"


class Agendamento(BaseModel):
    STATUS_INATIVOS = {
        "CANCELADO_CIDADAO",
        "CANCELADO_CRAS",
        "AUSENCIA_CIDADAO",
        "ATIVADO_AUSENTE",
        "FINALIZADO",
    }

    cidadao = models.ForeignKey(Cidadao, verbose_name="Cidadão", on_delete=models.CASCADE, related_name="agendamentos")
    atendente = models.ForeignKey(
        Usuario,
        verbose_name="Atendente",
        null=True,
        blank=True,
        limit_choices_to={"groups__name__in": ["Atendente", "Supervisor"],},
        on_delete=models.PROTECT,
    )
    unidade = models.ForeignKey(UnidadeCras, verbose_name="Unidade", on_delete=models.PROTECT, related_name="agendamentos")
    servico = models.ForeignKey(Servico, verbose_name="Serviço", on_delete=models.PROTECT, related_name="agendamentos")
    vaga = models.ForeignKey(AgendaVaga, verbose_name="Vaga", on_delete=models.PROTECT, related_name="agendamentos", null=True, blank=True)
    data = models.DateField(verbose_name="Data do agendamento", editable=False)
    horario = models.TimeField(verbose_name="Hora do Agendamento", editable=False)
    data_hora_inicio_atendimento = models.TimeField(verbose_name="Hora do início do atendimento", null=True, blank=True)
    data_hora_fim_atendimento = models.TimeField(verbose_name="Hora do final do atendimento", null=True, blank=True)
    observacoes_gerais = models.TextField(verbose_name="Observações gerais", null=True, blank=True, max_length=600)
    situacao = models.CharField(
        max_length=20,
        verbose_name="Situação do agendamento",
        choices=SITUACAO_AGENDAMENTO_CHOICES,
        default="AGENDADO",
    )
    servicos_adicionais = models.ManyToManyField(Servico, verbose_name="Serviços adicionais", null=True, blank=True)
    origem = models.CharField(verbose_name="Origem do agendamento", choices=ORIGEM_CHOICES, max_length=50, null=True, blank=True)
    motivo_territorio = models.TextField(verbose_name="Motivo de agendamento fora do território", null=True, blank=True, max_length=600)
    final_atendimento = models.CharField(verbose_name="Status final de atendimento", choices=STATUS_FINAL_ATENDIMENTO_CHOICES, null=True, blank=True, max_length=200)

    class Meta:
        verbose_name = "Agendamento"
        verbose_name_plural = "Agendamentos"
        ordering = ["data", "horario"]
        constraints = [
            models.UniqueConstraint(
            fields=["cidadao", "servico", "situacao"],
            condition=models.Q(situacao="AGENDADO"),
            name="um_agendamento_por_servico_por_cidadao",
            violation_error_message="Já existe um agendamento ativo para este serviço e cidadão.",
            )
        ]

    def __str__(self):
        return f"{self.cidadao.nome} - {self.servico.nome} - {self.data} {self.horario} - {self.unidade}"

    @classmethod
    def ativos_queryset(cls):
        return cls.objects.exclude(situacao__in=cls.STATUS_INATIVOS)

    @classmethod
    def possui_ativo_por_tipo(cls, cidadao, tipo_servico, exclude_pk=None):
        if not cidadao or not tipo_servico:
            return False
        qs = cls.ativos_queryset().filter(
            cidadao=cidadao,
            servico__tipo_servico=tipo_servico,
        )
        if exclude_pk:
            qs = qs.exclude(pk=exclude_pk)
        return qs.exists()

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        cancelado = {"CANCELADO_CIDADAO", "CANCELADO_CRAS", "AUSENCIA_CIDADAO"}
        old_situacao = None
        old_vaga_id = None
        if not is_new:
            prev = (
                Agendamento.objects.filter(pk=self.pk)
                .values("situacao", "vaga_id")
                .first()
            )
            if prev:
                old_situacao = prev["situacao"]
                old_vaga_id = prev["vaga_id"]
        vaga_changed = not is_new and old_vaga_id != self.vaga_id

        # Sempre sincroniza data e horário com a vaga, quando houver
        if self.vaga:
            self.data = self.vaga.data
            self.horario = self.vaga.horario

        # Validações
        exige_vaga = self.origem != "FILA"
        if is_new:
            if exige_vaga:
                if not self.vaga:
                    raise ValueError("Vaga é obrigatória para novos agendamentos.")
                if self.vaga.vagas_ocupadas >= self.vaga.vagas:
                    raise ValueError("Não há vagas disponíveis neste horário.")
                if self.vaga.tipo_servico != self.servico.tipo_servico:
                    raise ValueError("O serviço selecionado não pertence ao tipo desta vaga.")
        else:
            ativo = self.situacao not in cancelado
            if exige_vaga and ativo and not self.vaga:
                raise ValueError("Vaga é obrigatória enquanto o agendamento estiver ativo.")
            if vaga_changed and ativo and self.vaga and exige_vaga:
                if self.vaga.vagas_ocupadas >= self.vaga.vagas:
                    raise ValueError("Não há vagas disponíveis neste horário.")
                if self.vaga.tipo_servico != self.servico.tipo_servico:
                    raise ValueError("O serviço selecionado não pertence ao tipo desta vaga.")

        super().save(*args, **kwargs)

        # Ocupa/libera vaga
        if is_new:
            self.vaga.vagas_ocupadas += 1
            self.vaga.save()
        else:
            moved_to_cancel = (
                old_vaga_id
                and old_situacao not in cancelado
                and self.situacao in cancelado
            )
            if moved_to_cancel:
                try:
                    vaga = AgendaVaga.objects.get(pk=old_vaga_id)
                except AgendaVaga.DoesNotExist:
                    vaga = None

                if vaga and vaga.vagas_ocupadas > 0:
                    vaga.vagas_ocupadas -= 1
                    vaga.save(update_fields=["vagas_ocupadas", "updated_at"])
                Agendamento.objects.filter(pk=self.pk).update(vaga=None)
            elif vaga_changed:
                if old_vaga_id:
                    try:
                        vaga_antiga = AgendaVaga.objects.get(pk=old_vaga_id)
                    except AgendaVaga.DoesNotExist:
                        vaga_antiga = None
                    if vaga_antiga and vaga_antiga.vagas_ocupadas > 0:
                        vaga_antiga.vagas_ocupadas -= 1
                        vaga_antiga.save(update_fields=["vagas_ocupadas", "updated_at"])
                if self.vaga:
                    self.vaga.vagas_ocupadas += 1
                    self.vaga.save(update_fields=["vagas_ocupadas", "updated_at"])

    @classmethod
    def marcar_vencidos_como_ausencia(cls):
        """
        Atualiza para AUSENCIA_CIDADAO todos os agendamentos de datas passadas
        que ainda estÇœo em status abertos. Pensado para execuÇõÇœo automÇutica
        diariamente (ex.: agendador à meia-noite).
        """
        hoje = timezone.localdate()
        status_abertos = (
            "AGENDADO",
            "ATIVADO",
            "ATENDIMENTO",
            "CHAMANDO",
            "AGUARDANDO_FILA",
        )
        agora = timezone.now()
        return (
            cls.objects.filter(data__lt=hoje, situacao__in=status_abertos)
            .update(situacao="AUSENCIA_CIDADAO", updated_at=agora)
        )


class ChamadaPainel(BaseModel):
    agendamento = models.ForeignKey(
        Agendamento,
        verbose_name="Agendamento",
        on_delete=models.CASCADE,
        related_name="chamadas_painel",
    )
    unidade = models.ForeignKey(
        UnidadeCras,
        verbose_name="Unidade",
        on_delete=models.PROTECT,
        related_name="chamadas_painel",
    )
    cidadao_nome = models.CharField(verbose_name="Cidadão", max_length=200)
    guiche_nome = models.CharField(
        verbose_name="Guichê",
        max_length=120,
        null=True,
        blank=True,
    )
    guiche_id = models.CharField(
        verbose_name="ID do Guichê",
        max_length=64,
        null=True,
        blank=True,
    )
    chamado_em = models.DateTimeField(
        verbose_name="Data/Hora da chamada",
        default=timezone.now,
        db_index=True,
    )

    class Meta:
        verbose_name = "Chamada do Painel"
        verbose_name_plural = "Chamadas do Painel"
        ordering = ["-chamado_em", "-created_at"]

    def __str__(self):
        data_hora = timezone.localtime(self.chamado_em).strftime("%d/%m/%Y %H:%M")
        return f"{self.cidadao_nome} - {self.unidade.nome} - {data_hora}"

    @classmethod
    def limpar_chamadas_do_dia(cls, data=None):
        dia = data or timezone.localdate()
        total, _ = cls.objects.filter(chamado_em__date=dia).delete()
        return total
