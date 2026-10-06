from django.db import transaction
from django.db.models import Q
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from utils.email import send_email_in_thread
from .models import Agendamento, AgendaVaga
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
import logging

logger = logging.getLogger(__name__)


def sincronizar_capacidade_vagas(vagas):
    """Reconcilia vagas apó criar, alterar ou remover bloqueios de horário."""
    from unidade_posto.models import BloqueioHorario

    ids = list(vagas.values_list("pk", flat=True))
    with transaction.atomic():
        for vaga in AgendaVaga.objects.select_for_update().filter(pk__in=ids):
            bloqueada = BloqueioHorario.objects.filter(
                unidades=vaga.unidade,
                is_active=True,
                data__lte=vaga.data,
                hora_inicio__lte=vaga.horario,
                hora_fim__gt=vaga.horario,
            ).filter(Q(data_final__gte=vaga.data) | Q(data_final__isnull=True, data=vaga.data)).exists()
            if bloqueada:
                ocupadas = vaga.vagas
            else:
                ocupadas = min(
                    Agendamento.objects.filter(vaga_id=vaga.pk)
                    .exclude(situacao__in=Agendamento.STATUS_LIBERAM_VAGA)
                    .count(),
                    vaga.vagas,
                )
            if vaga.vagas_ocupadas != ocupadas:
                vaga.vagas_ocupadas = ocupadas
                vaga.save(update_fields=["vagas_ocupadas", "updated_at"])

# FALTA VALIDAR CANCELAMENTO
def cancelar_agendamento(agendamento_id, origem="CANCELADO_CRAS", liberar_vaga=True):
    """
    Cancela um agendamento; a liberação da vaga ocorre exclusivamente no model.

    ``liberar_vaga`` foi mantido apenas por compatibilidade de chamada. Bloqueios de
    horário passam a ocupar a capacidade separadamente, sem atribuir a vaga a um
    agendamento cancelado.
    """
    with transaction.atomic():
        try:
            agendamento = (
                Agendamento.objects.select_for_update()
                .get(pk=agendamento_id)
            )
        except Agendamento.DoesNotExist:
            raise NotFound("Agendamento não encontrado.")

        if "CANCELADO" in agendamento.situacao:
            raise ValidationError("Agendamento já está cancelado.")
        tinha_vaga = bool(agendamento.vaga_id)
        agendamento.situacao = origem
        try:
            agendamento.save(update_fields=["situacao", "updated_at"])
        except Exception as error:
            if hasattr(error, "message_dict"):
                raise ValidationError(error.message_dict)
            raise
        
        # Só envia email se a origem for do CRAS
        if origem == "CANCELADO_CRAS":
            transaction.on_commit(lambda: _send_agendamento_cancelado_email(agendamento))
    mensagem = "Agendamento marcado como cancelado."
    if tinha_vaga:
        mensagem += " Vaga liberada."

    return mensagem

def _send_agendamento_cancelado_email(agendamento: Agendamento):
    cidadao = agendamento.cidadao
    email = getattr(cidadao, "email", None) if cidadao else None
    if not email:
        return
    unidade = agendamento.unidade
    data = agendamento.data.strftime("%d/%m/%Y") if agendamento.data else ""
    horario = agendamento.horario.strftime("%H:%M") if agendamento.horario else ""
    unidade_nome = unidade.nome if unidade else ""
    servico_nome = agendamento.servico.nome if agendamento.servico_id else ""

    subject = "Cancelamento do seu agendamento"
    message = (
        "Seu agendamento "
        f"para o serviço {servico_nome} "
        f"marcado para o dia {data} "
        f"no horário de {horario} "
        f"na unidade {unidade_nome} "
        "foi cancelado."
    )

    context = {
        "cidadao_nome": getattr(cidadao, "nome", "") if cidadao else "",
        "servico_nome": servico_nome,
        "data": data,
        "horario": horario,
        "unidade_nome": unidade_nome,
        "contato_url": (
            "https://desenvolvimentosocial.fortaleza.ce.gov.br/"
            "atendimento/enderecos-e-telefones/2-uncategorised/"
            "57-telefones-e-enderecos-cras"
        ),
        "nome_sistema": settings.NOME_SISTEMA,
    }
    html = render_to_string("agendamentos/email_agendamento_cancelado.html", context)
    message = strip_tags(html)
    try:
        send_email_in_thread(
            email,
            subject,
            message,
            html,
            getattr(settings, "DEFAULT_FROM_EMAIL", None),
        )
    except Exception:
        logger.exception("Falha ao enviar email de cancelamento do agendamento para %s", email)
