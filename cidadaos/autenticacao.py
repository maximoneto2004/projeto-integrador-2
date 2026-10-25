import hashlib
import re
from datetime import timedelta

from django.conf import settings
from rest_framework import permissions
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.throttling import SimpleRateThrottle
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import Token

from cidadaos.models import Cidadao


class CidadaoAccessToken(Token):
    """Token de acesso do cidadão. O tipo próprio faz o JWTAuthentication dos funcionários recusá-lo."""

    token_type = "cidadao"

    @property
    def lifetime(self):
        return timedelta(minutes=settings.CIDADAO_TOKEN_VALIDADE_MINUTOS)

    @classmethod
    def para_cidadao(cls, cidadao):
        token = cls()
        token["cidadao_id"] = str(cidadao.id)
        return token


class CidadaoAutenticado:
    """Ocupa o lugar de request.user nas rotas do cidadão."""

    is_authenticated = True
    is_anonymous = False

    def __init__(self, cidadao):
        self.cidadao = cidadao
        self.pk = self.id = cidadao.id


class CidadaoJWTAuthentication(JWTAuthentication):
    def get_validated_token(self, raw_token):
        try:
            return CidadaoAccessToken(raw_token)
        except TokenError as exc:
            raise InvalidToken({"detail": "Token de cidadão inválido ou expirado."}) from exc

    def get_user(self, validated_token):
        cidadao = Cidadao.objects.filter(pk=validated_token.get("cidadao_id"), is_active=True).first()
        if cidadao is None:
            raise AuthenticationFailed("Cidadão não encontrado ou inativo.")
        return CidadaoAutenticado(cidadao)


class IsCidadao(permissions.BasePermission):
    def has_permission(self, request, view):
        return isinstance(request.user, CidadaoAutenticado)


class _LimiteEnvioPorCpf(SimpleRateThrottle):
    """Limita pedidos de código por CPF, exista ou não o cadastro, para o limite não revelar quem é cidadão.

    Por IP não funcionaria: todas as chamadas legítimas vêm do servidor do agente.
    """

    periodo = None
    setting = None

    def get_rate(self):
        return f"{getattr(settings, self.setting)}/{self.periodo}"

    def get_cache_key(self, request, view):
        dados = request.data if hasattr(request.data, "get") else {}
        cpf = re.sub(r"\D", "", str(dados.get("cpf") or ""))
        if not cpf:
            return None
        return self.cache_format % {"scope": self.scope, "ident": hashlib.sha256(cpf.encode()).hexdigest()}


class LimiteEnvioPorCpfMinuto(_LimiteEnvioPorCpf):
    scope = "cidadao_codigo_minuto"
    periodo = "min"
    setting = "CIDADAO_CODIGO_ENVIOS_POR_MINUTO"


class LimiteEnvioPorCpfHora(_LimiteEnvioPorCpf):
    scope = "cidadao_codigo_hora"
    periodo = "hour"
    setting = "CIDADAO_CODIGO_ENVIOS_POR_HORA"
