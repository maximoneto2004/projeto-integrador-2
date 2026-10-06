import re
import secrets
from datetime import timedelta

from django.conf import settings
from django.contrib.auth.hashers import check_password, make_password
from django.db import transaction
from django.db.models import F, Q, Sum
from django.utils import timezone
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError

from agendamentos.models import Agendamento, AgendaVaga
from agendamentos.services import cancelar_agendamento
from cidadaos.models import Cidadao
from integracao.models import DesafioAutenticacaoCidadao, SessaoCidadao, hash_token
from medicamentos.models import LoteMedicamento
from prontuario.models import Receita
from servicos.models import Servico


def somente_digitos(value):
    return re.sub(r"\D", "", value or "")


def normalizar_telefone(value):
    digits = somente_digitos(value)
    if digits.startswith("00"):
        digits = digits[2:]
    if len(digits) in (10, 11):
        digits = "55" + digits
    if not 12 <= len(digits) <= 15:
        raise ValidationError({"telefone": "Informe um telefone válido, preferencialmente em E.164."})
    return "+" + digits


def exigir_mock():
    if not settings.CITIZEN_AUTH_MOCK_ENABLED:
        raise PermissionDenied("Autenticação mock desabilitada.")
    if not settings.CITIZEN_AUTH_MOCK_CODE:
        raise PermissionDenied("Código mock não configurado.")


@transaction.atomic
def iniciar_desafio(cpf, telefone):
    exigir_mock()
    cpf = somente_digitos(cpf)
    telefone = normalizar_telefone(telefone)
    try:
        cidadao = Cidadao.objects.select_for_update().get(cpf=cpf, is_active=True)
    except Cidadao.DoesNotExist as exc:
        raise NotFound("Cidadão não encontrado.") from exc
    if cidadao.telefone and normalizar_telefone(cidadao.telefone) != telefone:
        raise ValidationError({"telefone": "O telefone informado não corresponde ao cadastro do cidadão."})
    DesafioAutenticacaoCidadao.objects.filter(
        cidadao=cidadao, telefone=telefone, used_at__isnull=True, is_active=True
    ).update(is_active=False)
    return DesafioAutenticacaoCidadao.objects.create(
        cidadao=cidadao,
        telefone=telefone,
        code_hash=make_password(settings.CITIZEN_AUTH_MOCK_CODE),
        expires_at=timezone.now() + timedelta(minutes=settings.CITIZEN_AUTH_CHALLENGE_MINUTES),
    )


def verificar_desafio(challenge_id, code):
    exigir_mock()
    erro = None
    with transaction.atomic():
        try:
            cidadao_id = DesafioAutenticacaoCidadao.objects.only("cidadao_id").get(pk=challenge_id).cidadao_id
            Cidadao.objects.select_for_update().get(pk=cidadao_id)
            desafio = DesafioAutenticacaoCidadao.objects.select_for_update().select_related("cidadao").get(pk=challenge_id)
        except DesafioAutenticacaoCidadao.DoesNotExist as exc:
            raise NotFound("Desafio não encontrado.") from exc
        except Cidadao.DoesNotExist as exc:
            raise NotFound("Cidadão não encontrado.") from exc
        if desafio.used_at is not None or not desafio.is_active:
            erro = ValidationError({"challenge_id": "Desafio já utilizado ou invalidado."})
        elif timezone.now() >= desafio.expires_at:
            desafio.is_active = False
            desafio.save(update_fields=["is_active", "updated_at"])
            erro = ValidationError({"challenge_id": "Desafio expirado."})
        elif desafio.attempts >= settings.CITIZEN_AUTH_MAX_ATTEMPTS:
            desafio.is_active = False
            desafio.save(update_fields=["is_active", "updated_at"])
            erro = ValidationError({"code": "Limite de tentativas excedido."})
        elif not check_password(code, desafio.code_hash):
            desafio.attempts += 1
            if desafio.attempts >= settings.CITIZEN_AUTH_MAX_ATTEMPTS:
                desafio.is_active = False
            desafio.save(update_fields=["attempts", "is_active", "updated_at"])
            erro = ValidationError({"code": "Código inválido."})
        else:
            agora = timezone.now()
            desafio.used_at = agora
            desafio.save(update_fields=["used_at", "updated_at"])
            SessaoCidadao.objects.filter(
                Q(cidadao=desafio.cidadao) | Q(telefone=desafio.telefone),
                revoked_at__isnull=True,
                is_active=True,
            ).update(revoked_at=agora)
            token = secrets.token_urlsafe(32)
            sessao = SessaoCidadao.objects.create(
                cidadao=desafio.cidadao,
                telefone=desafio.telefone,
                token_hash=hash_token(token),
                authenticated_at=agora,
                expires_at=agora + timedelta(hours=settings.CITIZEN_SESSION_HOURS),
            )
    if erro:
        raise erro
    return sessao, token


@transaction.atomic
def criar_agendamento_cidadao(cidadao, vaga_id, servico_id, motivo_territorio=""):
    try:
        vaga = AgendaVaga.objects.select_for_update().select_related("unidade", "tipo_servico").get(
            pk=vaga_id, is_active=True
        )
        servico = Servico.objects.get(pk=servico_id, is_active=True)
    except (AgendaVaga.DoesNotExist, Servico.DoesNotExist) as exc:
        raise NotFound("Vaga ou serviço não encontrado.") from exc
    if vaga.data < timezone.localdate() or vaga.vagas_ocupadas >= vaga.vagas:
        raise ValidationError({"vaga_id": "Vaga indisponível."})
    if servico.tipo_servico_id != vaga.tipo_servico_id:
        raise ValidationError({"servico_id": "O serviço não pertence ao tipo da vaga."})
    if Agendamento.possui_ativo_por_tipo(cidadao, servico.tipo_servico):
        raise ValidationError({"servico_id": "Já existe agendamento ativo deste tipo para o cidadão."})
    if cidadao.unidade_origem_id and cidadao.unidade_origem_id != vaga.unidade_id and not motivo_territorio.strip():
        raise ValidationError({"motivo_territorio": "Informe o motivo para agendamento fora da unidade de origem."})
    return Agendamento.objects.create(
        cidadao=cidadao,
        unidade=vaga.unidade,
        servico=servico,
        vaga=vaga,
        data=vaga.data,
        horario=vaga.horario,
        situacao="AGENDADO",
        origem="SITE",
        motivo_territorio=motivo_territorio.strip() or None,
    )


def cancelar_agendamento_cidadao(cidadao, agendamento_id):
    if not Agendamento.objects.filter(pk=agendamento_id, cidadao=cidadao).exists():
        raise NotFound("Agendamento não encontrado.")
    return cancelar_agendamento(agendamento_id, origem="CANCELADO_CIDADAO")


def disponibilidade_receita(cidadao, receita_id):
    try:
        receita = Receita.objects.prefetch_related("medicamentos__medicamento").get(pk=receita_id, cidadao=cidadao)
    except Receita.DoesNotExist as exc:
        raise NotFound("Receita não encontrada.") from exc
    ids = [item.medicamento_id for item in receita.medicamentos.all() if item.medicamento_id]
    hoje = timezone.localdate()
    saldos = {
        (row["medicamento_id"], row["unidade_id"]): row["total"]
        for row in LoteMedicamento.objects.filter(
            medicamento_id__in=ids, is_active=True, validade__gte=hoje
        ).values("medicamento_id", "unidade_id").annotate(total=Sum("quantidade_atual"))
    }
    from unidade_posto.models import UnidadePosto
    unidades = list(UnidadePosto.objects.filter(is_active=True).values("id", "nome"))
    return [
        {
            "medicamento_id": str(item.medicamento_id),
            "nome": item.nome,
            "unidades": [
                {
                    "unidade_id": str(unidade["id"]),
                    "unidade_nome": unidade["nome"],
                    "quantidade_disponivel": saldos.get((item.medicamento_id, unidade["id"]), 0),
                    "disponivel": saldos.get((item.medicamento_id, unidade["id"]), 0) > 0,
                }
                for unidade in unidades
            ],
        }
        for item in receita.medicamentos.all() if item.medicamento_id
    ]
