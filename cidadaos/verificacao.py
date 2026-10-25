import functools
import logging
import re
import secrets
import threading
import uuid
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone
from django.utils.html import escape
from rest_framework.exceptions import ValidationError

from cidadaos.models import Cidadao, VerificacaoCidadao

logger = logging.getLogger(__name__)

CODIGO_INVALIDO = "Código inválido ou expirado. Solicite um novo código."


def _gerar_codigo():
    return f"{secrets.randbelow(10 ** 6):06d}"


def _enviar_codigo(email, nome, codigo, minutos):
    sistema = settings.NOME_SISTEMA
    assunto = f"{sistema} - código de verificação"
    texto = (
        f"Olá, {nome}.\n\n"
        f"Seu código de verificação do {sistema} é: {codigo}\n\n"
        f"Ele vale por {minutos} minutos. Não compartilhe este código com ninguém.\n"
        "Se você não pediu este código, ignore este e-mail."
    )
    html = (
        f"<p>Olá, {escape(nome)}.</p>"
        f"<p>Seu código de verificação do {sistema} é:</p>"
        f'<p style="font-size:28px;font-weight:bold;letter-spacing:6px">{codigo}</p>'
        f"<p>Ele vale por {minutos} minutos. Não compartilhe este código com ninguém.</p>"
        "<p>Se você não pediu este código, ignore este e-mail.</p>"
    )
    try:
        send_mail(assunto, texto, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False, html_message=html)
    except Exception:
        logger.exception("Falha ao enviar código de verificação para %s", email)


@functools.cache
def _hash_ficticio():
    # Nenhum código de 6 dígitos confere com ele.
    return make_password(secrets.token_hex())


def _enviar_em_segundo_plano(*args):
    # O SMTP leva segundos; responder antes dele evita que a demora denuncie que o CPF tem cadastro.
    threading.Thread(target=_enviar_codigo, args=args, daemon=True).start()


def iniciar_verificacao(cpf):
    """Gera um código para o cidadão do CPF e o envia ao e-mail cadastrado.

    Devolve (verificacao_id, expira_em) mesmo quando não há cidadão com e-mail para o CPF,
    para a rota pública não revelar quem tem cadastro; nesse caso o id não existe e a
    confirmação falha como um código errado.
    """
    cpf = re.sub(r"\D", "", cpf or "")
    minutos = settings.CIDADAO_CODIGO_VALIDADE_MINUTOS
    expira_em = timezone.now() + timedelta(minutes=minutos)
    codigo = _gerar_codigo()
    # Calculado antes da busca para o tempo de resposta ser o mesmo com ou sem cadastro.
    codigo_hash = make_password(codigo)

    cidadao = Cidadao.objects.filter(cpf=cpf, is_active=True).exclude(email__isnull=True).exclude(email="").first()
    if not cidadao:
        return uuid.uuid4(), expira_em

    with transaction.atomic():
        # Um novo pedido invalida os códigos anteriores ainda em aberto.
        VerificacaoCidadao.objects.filter(cidadao=cidadao, utilizado_em__isnull=True, is_active=True).update(
            is_active=False
        )
        verificacao = VerificacaoCidadao.objects.create(
            cidadao=cidadao,
            email=cidadao.email,
            codigo_hash=codigo_hash,
            expira_em=expira_em,
        )
    _enviar_em_segundo_plano(cidadao.email, cidadao.nome, codigo, minutos)
    return verificacao.id, expira_em


def confirmar_verificacao(verificacao_id, codigo):
    """Valida o código informado. Retorna o cidadão quando o código confere.

    Toda falha devolve a mesma mensagem, para não revelar se a verificação existe.
    """
    max_tentativas = settings.CIDADAO_CODIGO_MAX_TENTATIVAS
    with transaction.atomic():
        verificacao = (
            VerificacaoCidadao.objects.select_for_update()
            .select_related("cidadao")
            .filter(pk=verificacao_id, is_active=True, utilizado_em__isnull=True)
            .first()
        )
        # O hash é sempre conferido, para o tempo de resposta não distinguir verificação inexistente ou expirada.
        confere = check_password(codigo, verificacao.codigo_hash if verificacao else _hash_ficticio())
        if verificacao is None:
            pass
        elif timezone.now() >= verificacao.expira_em:
            verificacao.is_active = False
            verificacao.save(update_fields=["is_active", "updated_at"])
        elif not confere:
            verificacao.tentativas += 1
            if verificacao.tentativas >= max_tentativas:
                verificacao.is_active = False
            verificacao.save(update_fields=["tentativas", "is_active", "updated_at"])
        else:
            verificacao.utilizado_em = timezone.now()
            verificacao.save(update_fields=["utilizado_em", "updated_at"])
            return verificacao.cidadao
    # Fora do atomic para que a contagem de tentativas seja gravada antes do erro.
    raise ValidationError({"codigo": CODIGO_INVALIDO})
