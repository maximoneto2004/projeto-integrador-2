import time
import jwt

from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from cidadaos.requests_fd import (
    SS_EXT,
    build_identity_from_token,
    get_valid_token_or_none,
)


class SSOUser:
    is_authenticated = True

    def __init__(self, claims):
        self.claims = claims or {}
        self.username = (
            self.claims.get("preferred_username")
            or self.claims.get("cpf")
            or self.claims.get("email")
        )
        self.groups = _EmptyGroups()

    def __str__(self):
        return self.username or "sso-user"


class _EmptyGroups:
    def filter(self, **kwargs):
        return self

    def exists(self):
        return False


class SSOAuthentication(BaseAuthentication):
    def authenticate(self, request):
        access_token = None
        token_parsed = None

        auth = get_authorization_header(request).split()
        if auth and auth[0].lower() == b"bearer" and len(auth) == 2:
            access_token = auth[1].decode("utf-8")
            try:
                token_parsed = jwt.decode(
                    access_token,
                    options={"verify_signature": False, "verify_aud": False},
                )
            except Exception:
                raise AuthenticationFailed("Token SSO inválido.")
        else:
            token_parsed = get_valid_token_or_none(request)
            if token_parsed:
                access_token = request.session.get(f"token-{SS_EXT}")

        if not token_parsed:
            raise AuthenticationFailed("Token SSO ausente.")

        exp = token_parsed.get("exp")
        if exp and int(exp) < int(time.time()):
            raise AuthenticationFailed("Token SSO expirado.")

        identidade = build_identity_from_token(access_token, token_parsed)
        if not identidade:
            raise AuthenticationFailed("Não foi possível montar identidade do cidadão.")

        request.sso_access_token = access_token
        request.sso_token_parsed = token_parsed
        request.sso_identity = identidade
        return (SSOUser(token_parsed), token_parsed)
