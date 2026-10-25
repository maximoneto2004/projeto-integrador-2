from django.db import transaction
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.utils import timezone
from app.static_data import TIPO_MARCACAO_AGENDAMENTO
from unidade_posto.models import ServicoUnidadePosto
from utils.email import send_email_in_thread
from .models import Agendamento, AgendaVaga
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
import logging

logger = logging.getLogger(__name__)


def ofertas_agendaveis(unidade_id):
    """Serviços que a recepção pode marcar; os de encaminhamento interno são registrados só como adicionais."""
    return ServicoUnidadePosto.objects.filter(
        unidade_id=unidade_id,
        is_active=True,
        servico__is_active=True,
        servico__tipo_marcacao=TIPO_MARCACAO_AGENDAMENTO,
    )


def formatar_endereco_unidade(unidade):
    if not unidade:
        return ""
    partes = [unidade.logradouro, unidade.numero]
    if unidade.complemento:
        partes.append(unidade.complemento)
    endereco = ", ".join([p for p in partes if p])
    bairro = unidade.bairro.nome if unidade.bairro_id else ""
    if bairro:
        endereco = f"{endereco} - {bairro}" if endereco else bairro
    if unidade.cep:
        endereco = f"{endereco} - CEP {unidade.cep}" if endereco else f"CEP {unidade.cep}"
    return endereco

# FALTA VALIDAR CANCELAMENTO
def cancelar_agendamento(agendamento_id, origem="CANCELADO_CRAS", liberar_vaga=True):
    """
    Cancela um agendamento e pode notificar ou não o cidadão.
    Se o cancelamento foi pelo cidadão, ele libera a vaga e não manda email.
    Se o cancelamento foi pelo cras por motivo de bloqueio de horario, ele não libera a vaga mas manda o email
    Se o cancelamento foi pelo cras sem ser por bloqueio de horario, ele libera a vaga e manda o email.
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
        
        # A vaga é liberada pelo Agendamento.save() ao passar para cancelado; aqui ela só é travada.
        # Descontar também aqui liberava a vaga duas vezes.
        if liberar_vaga and agendamento.vaga_id:
            if not AgendaVaga.objects.select_for_update().filter(pk=agendamento.vaga_id).exists():
                raise ValidationError("A vaga associada a este agendamento não existe mais.")

        # atualizando status do agendamento
        agendamento.situacao = origem 
        agendamento.updated_at = timezone.now()
        agendamento.save(update_fields=["situacao", "updated_at"])
        
        # Só envia email se a origem for do CRAS
        if origem == "CANCELADO_CRAS":
            _send_agendamento_cancelado_email(agendamento)
    mensagem = "Agendamento marcado como cancelado."
    if liberar_vaga:
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