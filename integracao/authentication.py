import secrets

from django.conf import settings
from django.contrib.auth.models import AnonymousUser
from rest_framework import authentication, exceptions, permissions

from integracao.models import SessaoCidadao, hash_token


class CitizenSessionAuthentication(authentication.BaseAuthentication):
    header = "X-Citizen-Session"

    def authenticate(self, request):
        token = request.headers.get(self.header)
        if not token:
            return None
        try:
            sessao = SessaoCidadao.objects.select_related("cidadao").get(token_hash=hash_token(token))
        except SessaoCidadao.DoesNotExist as exc:
            raise exceptions.AuthenticationFailed("Sessão cidadã inválida.") from exc
        if not sessao.is_valid:
            raise exceptions.AuthenticationFailed("Sessão cidadã expirada ou revogada.")
        return AnonymousUser(), sessao


class IntegrationKeyAuthentication(authentication.BaseAuthentication):
    header = "X-Integration-Key"

    def authenticate(self, request):
        informed = request.headers.get(self.header, "")
        expected = settings.INTEGRATION_LOGIN_API_KEY
        if not expected or not informed or not secrets.compare_digest(informed, expected):
            raise exceptions.AuthenticationFailed("Credencial da integração ausente ou inválida.")
        return AnonymousUser(), "integration-login"


class IsIntegrationKeyAuthenticated(permissions.BasePermission):
    message = "Informe uma credencial de integração válida."

    def has_permission(self, request, view):
        return request.auth == "integration-login"


class IsCitizenSessionAuthenticated(permissions.BasePermission):
    message = "Informe uma sessão cidadã válida."

    def has_permission(self, request, view):
        return isinstance(request.auth, SessaoCidadao) and request.auth.is_valid
