from django.core.exceptions import ValidationError
from django.db import models, transaction
from django.utils import timezone

from app.mixins import BaseModel
from unidade_posto.models import UnidadePosto
from servicos.models import Servico, TipoServico
from cidadaos.models import Cidadao
from app.static_data import (
    GRUPO_SUPERVISOR,
    GRUPOS_PROFISSIONAIS_SAUDE,
    ORIGEM_CHOICES,
    SITUACAO_AGENDAMENTO_CHOICES,
    STATUS_FINAL_ATENDIMENTO_CHOICES,
)
from usuarios.models import Usuario


class AgendaVaga(BaseModel):
    unidade = models.ForeignKey(UnidadePosto, verbose_name="Unidade Posto", on_delete=models.PROTECT)
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
    STATUS_LIBERAM_VAGA = {
        "CANCELADO_CIDADAO",
        "CANCELADO_CRAS",
        "AUSENCIA_CIDADAO",
        "ATIVADO_AUSENTE",
    }
    TRANSICOES_PERMITIDAS = {
        "AGENDADO": {"ATIVADO", "CANCELADO_CIDADAO", "CANCELADO_CRAS", "AUSENCIA_CIDADAO"},
        "ATIVADO": {"CHAMANDO", "CANCELADO_CIDADAO", "CANCELADO_CRAS", "AUSENCIA_CIDADAO"},
        "AGUARDANDO_FILA": {"CHAMANDO", "CANCELADO_CIDADAO", "CANCELADO_CRAS", "AUSENCIA_CIDADAO"},
        "CHAMANDO": {"ATENDIMENTO", "ATIVADO_AUSENTE", "CANCELADO_CIDADAO", "CANCELADO_CRAS", "AUSENCIA_CIDADAO"},
        "ATENDIMENTO": {"FINALIZADO", "CANCELADO_CIDADAO", "CANCELADO_CRAS", "AUSENCIA_CIDADAO"},
        "FINALIZADO": set(),
        "CANCELADO_CIDADAO": set(),
        "CANCELADO_CRAS": set(),
        "AUSENCIA_CIDADAO": set(),
        "ATIVADO_AUSENTE": set(),
    }

    cidadao = models.ForeignKey(Cidadao, verbose_name="Cidadão", on_delete=models.CASCADE, related_name="agendamentos")
    atendente = models.ForeignKey(
        Usuario,
        verbose_name="Atendente",
        null=True,
        blank=True,
        limit_choices_to={"groups__name__in": [*GRUPOS_PROFISSIONAIS_SAUDE, GRUPO_SUPERVISOR]},
        on_delete=models.PROTECT,
    )
    unidade = models.ForeignKey(UnidadePosto, verbose_name="Unidade", on_delete=models.PROTECT, related_name="agendamentos")
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

    @classmethod
    def validar_transicao(cls, situacao_anterior, nova_situacao):
        if situacao_anterior == nova_situacao:
            return
        if nova_situacao not in cls.TRANSICOES_PERMITIDAS.get(situacao_anterior, set()):
            raise ValidationError(
                {"situacao": f"Transição inválida: {situacao_anterior} → {nova_situacao}."}
            )

    @classmethod
    def _reserva_vaga(cls, situacao, vaga_id):
        return bool(vaga_id) and situacao not in cls.STATUS_LIBERAM_VAGA

    @staticmethod
    def _alterar_ocupacao(vaga, delta):
        nova_ocupacao = max(vaga.vagas_ocupadas + delta, 0) if delta < 0 else vaga.vagas_ocupadas + delta
        if nova_ocupacao > vaga.vagas:
            raise ValidationError(
                {"vaga": "A ocupação da vaga ficaria fora do limite permitido."}
            )
        vaga.vagas_ocupadas = nova_ocupacao
        vaga.save(update_fields=["vagas_ocupadas", "updated_at"])

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        with transaction.atomic():
            anterior = None
            if not is_new:
                anterior = Agendamento.objects.select_for_update().filter(pk=self.pk).first()
                if anterior is None:
                    is_new = True

            situacao_anterior = anterior.situacao if anterior else None
            vaga_anterior_id = anterior.vaga_id if anterior else None
            if anterior:
                self.validar_transicao(situacao_anterior, self.situacao)

            ids_vagas = sorted(
                {vaga_id for vaga_id in (vaga_anterior_id, self.vaga_id) if vaga_id},
                key=str,
            )
            vagas = {
                vaga.pk: vaga
                for vaga in AgendaVaga.objects.select_for_update().filter(pk__in=ids_vagas)
            }
            vaga_nova = vagas.get(self.vaga_id)
            exige_vaga = self.origem != "FILA"
            reserva_nova = self._reserva_vaga(self.situacao, self.vaga_id)
            reserva_anterior = bool(anterior) and self._reserva_vaga(
                situacao_anterior, vaga_anterior_id
            )

            if exige_vaga and self.situacao not in self.STATUS_LIBERAM_VAGA and not self.vaga_id:
                raise ValidationError({"vaga": "Vaga é obrigatória para agendamentos programados ativos."})
            if vaga_nova:
                if vaga_nova.tipo_servico_id != self.servico.tipo_servico_id:
                    raise ValidationError({"vaga": "O serviço selecionado não pertence ao tipo desta vaga."})
                self.vaga = vaga_nova
                self.unidade = vaga_nova.unidade
                self.data = vaga_nova.data
                self.horario = vaga_nova.horario

            precisa_ocupar_nova = reserva_nova and (
                not reserva_anterior or vaga_anterior_id != self.vaga_id
            )
            if precisa_ocupar_nova and (
                vaga_nova is None or vaga_nova.vagas_ocupadas >= vaga_nova.vagas
            ):
                raise ValidationError({"vaga": "Não há vagas disponíveis neste horário."})

            liberar_antiga = reserva_anterior and (
                not reserva_nova or vaga_anterior_id != self.vaga_id
            )
            if self.situacao in self.STATUS_LIBERAM_VAGA:
                self.vaga = None

            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                campos = set(update_fields)
                if self.vaga_id != vaga_anterior_id:
                    campos.add("vaga")
                if vaga_nova:
                    campos.update({"unidade", "data", "horario"})
                kwargs["update_fields"] = list(campos)

            super().save(*args, **kwargs)

            if liberar_antiga:
                self._alterar_ocupacao(vagas[vaga_anterior_id], -1)
            if precisa_ocupar_nova:
                self._alterar_ocupacao(vaga_nova, 1)

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
        ids = list(
            cls.objects.filter(data__lt=hoje, situacao__in=status_abertos)
            .values_list("pk", flat=True)
        )
        total = 0
        for agendamento_id in ids:
            with transaction.atomic():
                agendamento = cls.objects.select_for_update().get(pk=agendamento_id)
                if agendamento.situacao not in status_abertos:
                    continue
                agendamento.situacao = "AUSENCIA_CIDADAO"
                agendamento.save(update_fields=["situacao", "updated_at"])
                total += 1
        return total


class ChamadaPainel(BaseModel):
    agendamento = models.ForeignKey(
        Agendamento,
        verbose_name="Agendamento",
        on_delete=models.CASCADE,
        related_name="chamadas_painel",
    )
    unidade = models.ForeignKey(
        UnidadePosto,
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
