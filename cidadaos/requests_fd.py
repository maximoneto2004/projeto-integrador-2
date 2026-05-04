from django.http import JsonResponse
from django.shortcuts import redirect
import json
import time
import re
import unicodedata

import furl
import requests
import jwt
from cidadaos.models import Cidadao

from dotenv import load_dotenv
import os
from django.conf import settings


dotenv_path = os.path.join(os.path.dirname(__file__), "..", ".env")
load_dotenv(dotenv_path)

secure_cookie = not settings.DEBUG
samesite_cookie = "None" if secure_cookie else "Lax"


API_URL = os.getenv("API_URL")
# API_URL = "https://pmf-apicast-prd.apps.ocp.fortaleza.ce.gov.br:443/fdigital/pessoa/v1/pessoa/"
RHSSO_URL_BASE = os.getenv("RHSSO_URL_BASE")
CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
REALM = os.getenv("REALM")
USER_KEY = os.getenv("USER_KEY")

HOST = os.getenv("HOST")
SS_EXT = os.getenv("SS_EXT")
REDIRECT_URI = os.getenv("REDIRECT_URI")
FRONTEND_SUCCESS_URL = os.getenv("FRONTEND_SUCCESS_URL")
FRONTEND_SEM_CADASTRO_URL = os.getenv("FRONTEND_SEM_CADASTRO_URL")
FRONTEND_SELO_URL = os.getenv("FRONTEND_SELO_URL")


def _build_fd_base_url(cpf):
    """Builds the Fortaleza Digital pessoa/base endpoint regardless of trailing slash config."""
    base = str(API_URL or "").strip()
    if not base:
        return ""
    return f"{base.rstrip('/')}/{str(cpf).strip()}/base"


def _log_fd_response(context, url, response):
    """Debug helper to inspect Fortaleza Digital payload during SSO/login."""
    try:
        status_code = getattr(response, "status_code", None)
        content_type = (response.headers or {}).get("Content-Type", "")
        # print(f"[FD][{context}] GET {url} -> status={status_code} content_type={content_type}")

        body_to_print = None
        if "application/json" in str(content_type).lower():
            try:
                body_to_print = response.json()
            except Exception:
                body_to_print = response.text
        else:
            body_to_print = response.text

        body_str = str(body_to_print)
        if len(body_str) > 4000:
            body_str = body_str[:4000] + "... [truncated]"
        # print(f"[FD][{context}] body={body_str}")
    except Exception as exc:
        print(f"[FD][{context}] failed to print response: {exc}")


def _normalize_text(value):
    if value is None:
        return ""
    text = str(value).strip()
    if not text:
        return ""
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = re.sub(r"\s+", " ", text)
    return text.casefold()


def _first_non_empty(*values):
    for value in values:
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return None


def _normalize_nome(value):
    if value is None:
        return None

    text = str(value).strip()
    if not text:
        return None

    return " ".join(part.capitalize() for part in text.split())


def _extract_endereco(perfil):
    if not isinstance(perfil, dict):
        return {}

    enderecos = perfil.get("enderecos")
    if isinstance(enderecos, list) and enderecos:
        first = enderecos[0]
        if isinstance(first, dict):
            return first
    if isinstance(enderecos, dict):
        return enderecos

    for key in ("endereco", "endereco_principal", "enderecoPrincipal", "address"):
        value = perfil.get(key)
        if isinstance(value, dict):
            return value
        if isinstance(value, list) and value and isinstance(value[0], dict):
            return value[0]
    return {}


def _extract_bairro_nome(endereco, perfil):
    if not isinstance(endereco, dict):
        endereco = {}

    bairro_raw = (
        endereco.get("bairro")
        or endereco.get("bairro_nome")
        or endereco.get("nome_bairro")
        or perfil.get("bairro")
        or perfil.get("bairro_nome")
    )
    if isinstance(bairro_raw, dict):
        return _first_non_empty(
            bairro_raw.get("nome"),
            bairro_raw.get("descricao"),
            bairro_raw.get("label"),
            bairro_raw.get("value"),
        )
    if isinstance(bairro_raw, str):
        return bairro_raw.strip() or None
    return None


def _resolve_bairro_id(bairro_nome):
    if not bairro_nome:
        return None
    try:
        from app.models import Bairro

        bairro_obj = Bairro.objects.filter(nome__iexact=bairro_nome).first()
        if bairro_obj:
            return str(bairro_obj.id)

        normalized_input = _normalize_text(bairro_nome)
        if not normalized_input:
            return None

        for candidate in Bairro.objects.all().only("id", "nome"):
            normalized_candidate = _normalize_text(candidate.nome)
            if normalized_candidate == normalized_input:
                return str(candidate.id)
        for candidate in Bairro.objects.all().only("id", "nome"):
            normalized_candidate = _normalize_text(candidate.nome)
            if normalized_input in normalized_candidate or normalized_candidate in normalized_input:
                return str(candidate.id)
    except Exception:
        return None
    return None


def _build_identity_data(request, token_parsed, perfil=None):
    if perfil is None and request is not None:
        perfil = get_cadastro(request)
    if not isinstance(perfil, dict):
        perfil = {}

    def _from_token(*keys):
        for k in keys:
            if token_parsed.get(k):
                return token_parsed.get(k)
        return None

    def _first_contact(apelidos):
        for contato in perfil.get("contatos") or []:
            tipo = (contato.get("tipo_contato") or {}).get("apelido")
            if tipo in apelidos and contato.get("nome"):
                return contato.get("nome")
        return None
    
    

    email = (
        perfil.get("email_preferencial")
        or _first_contact(["email"])
        or _from_token("email")
    )
    telefone = _first_contact(
        ["telefone_celular", "telefone_residencial", "telefone"]
    ) or _from_token("phone_number")

    end = _extract_endereco(perfil)
    bairro_nome = _extract_bairro_nome(end, perfil)
    bairro_id = _resolve_bairro_id(bairro_nome)

    print(perfil, " perfil")

    identidade = {
        "cpf": perfil.get("cpf") or _from_token("preferred_username"),
        "email": email,
        "nome": _normalize_nome(perfil.get("nome") or _from_token("name")),
        "telefone": telefone,
        "data_nascimento": perfil.get("dataNascimento") or _from_token("birthdate"),
        "sexo": perfil.get("sexo") or perfil.get("genero") or _from_token("gender"),
        "logradouro": _first_non_empty(end.get("logradouro"), end.get("endereco"), end.get("rua")),
        "numero": _first_non_empty(end.get("numero"), end.get("num")),
        "cep": _first_non_empty(end.get("cep"), end.get("codigo_postal"), end.get("postal_code")),
        "complemento": _first_non_empty(end.get("complemento"), end.get("referencia")),
    }

    if bairro_id:
        identidade["bairro"] = bairro_id
    

    return identidade


def get_cadastro_from_token(access_token, token_parsed):
    if not access_token or not token_parsed:
        return None
    cpf = token_parsed.get("preferred_username")
    if not cpf:
        return None
    # print(API_URL, " apiurl from token")
    url = _build_fd_base_url(cpf)
    headers = {
        "Authorization": "Bearer {}".format(access_token),
        # Some gateways expect `user-key` while others accept `user_key`.
        "user-key": USER_KEY,
        "user_key": USER_KEY,
    }
    response = requests.request("GET", url, headers=headers, data={})
    _log_fd_response("get_cadastro_from_token", url, response)
    if response.status_code == 200:
        return response.json()
    return None


def get_cadastro_base_from_token(access_token, cpf):
    if not access_token or not cpf:
        return None

    url = _build_fd_base_url(cpf)
    headers = {
        "Authorization": "Bearer {}".format(access_token),
        "user-key": USER_KEY,
        "user_key": USER_KEY,
    }
    response = requests.request("GET", url, headers=headers, data={})
    _log_fd_response("get_cadastro_base_from_token", url, response)
    if response.status_code == 200:
        return response.json()
    return None


def build_identity_from_token(access_token, token_parsed=None):
    if not access_token:
        return None
    if not token_parsed:
        token_parsed = jwt.decode(
            access_token, options={"verify_signature": False, "verify_aud": False}
        )
    perfil = get_cadastro_from_token(access_token, token_parsed)
    # print(perfil, " perfil 3")
    return _build_identity_data(None, token_parsed, perfil=perfil)


def check_auth_sso(request):
    token_parsed = get_valid_token_or_none(request)
    if not token_parsed:
        return redirect(
            RHSSO_URL_BASE
            + "/auth/realms/"
            + REALM
            + "/protocol/openid-connect/auth?response_type=code&"
            "client_id=" + CLIENT_ID + "&scope=openid" + "&redirect_uri=" + REDIRECT_URI
        )
    # return view(request, token_parsed, *args, **kwargs )


def login_sso(request):
    if request.method == "GET":
        code = request.GET.get("code")
        session_state = request.GET.get("session_state")

        if not code or not session_state:
            return redirect("/")

        token_url = (
            f"{RHSSO_URL_BASE}/auth/realms/{REALM}/protocol/openid-connect/token"
        )

        # print(token_url, " roken_url")

        payload = {
            "grant_type": "authorization_code",
            "redirect_uri": REDIRECT_URI,
            "client_id": CLIENT_ID,
            "client_secret": CLIENT_SECRET,
            "code": code,
        }

        # print(payload, " payload")

        headers = {
            "Content-Type": "application/x-www-form-urlencoded",
        }

        # Envio correto
        response = requests.post(token_url, data=payload, headers=headers)

        if response.status_code != 200:
            return JsonResponse(
                {
                    "result": "fail",
                    "message": f"Token request failed ({response.status_code})",
                    "details": response.text,
                }
            )

        tokens = response.json()
        access_token = tokens.get("access_token")
        # print(tokens.get("id_token"))
        

        if not access_token:
            return JsonResponse({"result": "fail", "message": "Access token missing"})

        # Skip audience verification because we are only using the token payload to prefill user data
        decoded = jwt.decode(
            access_token, options={"verify_signature": False, "verify_aud": False}
        )

        print(decoded, ' < -------------decode')

        # Salva sessão corretamente
        request.session[f"token-{SS_EXT}"] = access_token
        request.session[f"refresh_token-{SS_EXT}"] = tokens.get("refresh_token")
        request.session["id_token"] = tokens.get("id_token")
        request.session[f"token_parsed-{SS_EXT}"] = json.dumps(decoded)
        if not request.session.session_key:
            request.session.save()

        realm_access = decoded.get("realm_access") or {}
        roles = realm_access.get("roles") or []
        if isinstance(roles, str):
            roles = [roles]
        roles = {str(role).strip().lower() for role in roles if role is not None}
        if "basico" in roles:
            resp = redirect(FRONTEND_SELO_URL)
            refresh_token = tokens.get("refresh_token")
            if refresh_token:
                resp.set_cookie(
                    key="refresh_token_fod",
                    value=refresh_token,
                    httponly=True,
                    secure=secure_cookie,
                    samesite=samesite_cookie,
                    max_age=60 * 60 * 24 * 7,
                    path="/",
                )
            id_token = tokens.get("id_token")
            if True:
                resp.set_cookie(
                    key="id_token",
                    value=id_token,
                    httponly=True,
                    secure=secure_cookie,
                    samesite=samesite_cookie,
                    max_age=60 * 60 * 24 * 7,
                    path="/",
                )
            return resp

        identidade = _build_identity_data(request, decoded)
        request.session["cidadao_identity"] = identidade

        cpf = identidade.get("cpf")
        email = identidade.get("email")
        existe = None
        if cpf:
            existe = Cidadao.objects.filter(cpf=cpf).first()
        if not existe and email:
            existe = Cidadao.objects.filter(email=email).first()

        target_url = FRONTEND_SUCCESS_URL if existe else FRONTEND_SEM_CADASTRO_URL
        resp = redirect(target_url)
        refresh_token = tokens.get("refresh_token")
        if refresh_token:
            resp.set_cookie(
                key="refresh_token_fod",
                value=refresh_token,
                httponly=True,
                secure=secure_cookie,
                samesite=samesite_cookie,
                max_age=60 * 60 * 24 * 7,
                path="/",
            )
        id_token = tokens.get("id_token")
        if True:
            resp.set_cookie(
                key="id_token",
                value=id_token,
                httponly=True,
                secure=secure_cookie,
                samesite=samesite_cookie,
                max_age=60 * 60 * 24 * 7,
                path="/",
            )
        return resp
    
        

    return redirect("/")


def get_valid_token_or_none(request):
    try:
        token_parsed = request.session["token_parsed-{}".format(SS_EXT)]
        token_parsed = json.loads(token_parsed)
        if int(token_parsed["exp"] < int(time.time())):
            return None
        return token_parsed
    except Exception:
        return None


def logout(request):
    id_token = request.session.get("id_token")
    url = (
        RHSSO_URL_BASE
        + "/auth/realms/"
        + REALM
        + "/protocol/openid-connect/logout?"
        + "id_token_hint="
        + id_token
        + "redirect_uri="
        + REDIRECT_URI
    )
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": "Bearer {}".format(request.session["token-{}".format(SS_EXT)]),
    }
    payload = {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": request.session["refresh_token-{}".format(SS_EXT)],
    }

    f = furl.furl("")
    f.args = payload

    response = requests.request(
        "POST", url, headers=headers, data=payload, verify=False
    )
    if response.status_code in [200, 204]:
        return True
    return False


def refresh_token(request):
    url = RHSSO_URL_BASE + "/auth/realms/" + REALM + "/protocol/openid-connect/token"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
    }
    payload = {
        "grant_type": "refresh_token",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": request.session["refresh_token-{}".format(SS_EXT)],
    }

    f = furl.furl("")
    f.args = payload

    response = requests.request("POST", url, headers=headers, data=payload)
    if response.status_code == 200:
        tokens = response.json()
        token = tokens["access_token"]
        token_parsed = jwt.decode(token, verify=False)
        if token:
            request.session["token-{}".format(SS_EXT)] = token
            request.session["refresh_token-{}".format(SS_EXT)] = tokens["refresh_token"]
            request.session["token_parsed-{}".format(SS_EXT)] = json.dumps(token_parsed)
            id_token = request.session["id_token"] = tokens["id_token"]
            return True
    return False


def refresh_access_token_from_cookie(refresh_token):
    if not refresh_token:
        return None, "Refresh token não fornecido."

    url = RHSSO_URL_BASE + "/auth/realms/" + REALM + "/protocol/openid-connect/token"
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
    }
    payload = {
        "grant_type": "refresh_token",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "refresh_token": refresh_token,
    }

    response = requests.request("POST", url, headers=headers, data=payload)
    if response.status_code != 200:
        return None, response.text

    tokens = response.json()
    access_token = tokens.get("access_token")
    if not access_token:
        return None, "Access token ausente na resposta."
    return access_token, None


def get_cadastro(request):
    perfil = None
    if "token-{}".format(SS_EXT) in request.session:
        token_parsed = request.session["token_parsed-{}".format(SS_EXT)]
        token_parsed = json.loads(token_parsed)
        url = _build_fd_base_url(token_parsed["preferred_username"])
        payload = {}
        headers = {
            "Authorization": "Bearer {}".format(
                request.session["token-{}".format(SS_EXT)]
            ),
            # Keep both spellings for compatibility with API gateway mappings.
            "user-key": USER_KEY,
            "user_key": USER_KEY,
        }
        response = requests.request("GET", url, headers=headers, data=payload)
        _log_fd_response("get_cadastro", url, response)

        if response.status_code == 200:
            perfil = response.json()
        elif response.status_code in [401, 403]:
            return JsonResponse(
                {
                    "result": "fail",
                    "message": "Request failed {}!".format(response.status_code),
                }
            )
        else:
            perfil = "{} - {}".format(response.text, response.status_code)
    return perfil
