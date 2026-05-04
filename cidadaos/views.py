from django.http import Http404, JsonResponse
import logging

from rest_framework.exceptions import ValidationError


from django.contrib.admin.models import LogEntry, ADDITION, CHANGE, DELETION
from django.shortcuts import redirect
from django.urls import reverse_lazy
from django.views.generic.edit import FormView
from .filters import CidadaoFilter
from django_filters.rest_framework import DjangoFilterBackend

from rest_framework.response import Response
from rest_framework import generics, status, permissions
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView

from cidadaos.requests_fd import (
    get_valid_token_or_none,
    refresh_access_token_from_cookie,
    get_cadastro,
    get_cadastro_from_token,
    get_cadastro_base_from_token,
    logout as fd_logout,
    SS_EXT,
)
from app.permissions import DjangoModelPermissionsWithView
from cidadaos.authentication import SSOAuthentication

from .forms import CidadaoCadastroForm
from .models import Cidadao, normalize_nome
from .serializers import (
    CidadaoListDetailSerializer,
    CidadaoSerializer,
)

logger = logging.getLogger(__name__)

from django.conf import settings


secure_cookie = not settings.DEBUG
samesite_cookie = "None" if secure_cookie else "Lax"


def _normalize_profile_name(payload):
    if not isinstance(payload, dict):
        return payload

    normalized = dict(payload)
    if normalized.get("nome"):
        normalized["nome"] = normalize_nome(normalized.get("nome"))
    if normalized.get("name"):
        normalized["name"] = normalize_nome(normalized.get("name"))
    return normalized


def capturar_identidade(request):
    """
    Entrega a identidade do cidadão armazenada na sessão e limpa após entrega.
    """
    if not get_valid_token_or_none(request):
        return JsonResponse({"success": False, "result": "Unauthorized"}, status=401)

    identidade = request.session.get("cidadao_identity")
    if not identidade:
        return JsonResponse({"success": True, "result": None})

    # Remove para evitar reuso indevido
    request.session.pop("cidadao_identity", None)
    return JsonResponse({"success": True, "result": identidade})


class CompletarCadastroView(FormView):
    template_name = "cidadaos/completar_cadastro.html"
    form_class = CidadaoCadastroForm
    success_url = reverse_lazy("index")

    def dispatch(self, request, *args, **kwargs):
        if not get_valid_token_or_none(request):
            return redirect("login")

        self.identidade = request.session.get("cidadao_identity", {}) or {}
        cpf_lock = self.identidade.get("cpf")
        email_lock = self.identidade.get("email")

        existente = None
        if cpf_lock:
            existente = Cidadao.objects.filter(cpf=cpf_lock).first()
        if not existente and email_lock:
            existente = Cidadao.objects.filter(email=email_lock).first()

        if existente:
            request.session.pop("cidadao_identity", None)
            return redirect("index")

        if not self.identidade:
            return redirect("index")

        return super().dispatch(request, *args, **kwargs)

    def get_initial(self):
        return self.identidade

    def get_form_kwargs(self):
        kwargs = super().get_form_kwargs()
        kwargs["locked_identity"] = self.identidade
        return kwargs

    def form_valid(self, form):
        form.save()
        self.request.session.pop("cidadao_identity", None)
        return super().form_valid(form)


class CidadaoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    # permission_classes = [permissions.IsAuthenticated]
    queryset = Cidadao.objects.all()
    serializer_class = CidadaoSerializer
    filterset_class = CidadaoFilter
    filter_backends = [DjangoFilterBackend]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return CidadaoListDetailSerializer
        return CidadaoSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        headers = self.get_success_headers(serializer.data)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
            headers=headers,
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)

        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(
                {"success": True, "results": serializer.data}
            )

        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "results": serializer.data})


class CidadaoSSOUpsertView(APIView):
    authentication_classes = [SSOAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        identidade = dict(identidade)
        identidade.setdefault("origem", "SITE")
        # Evita enviar null para CharFields sem null=True no modelo Cidadao.
        for field in ("logradouro", "numero", "cep", "complemento"):
            if identidade.get(field) is None:
                identidade.pop(field, None)
        cpf = identidade.get("cpf")
        email = identidade.get("email")
        
        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existente = None
        if cpf:
            existente = Cidadao.objects.filter(cpf=cpf).first()
        if not existente and email:
            existente = Cidadao.objects.filter(email=email).first()

        try:
            if existente:
                serializer = CidadaoSerializer(existente, data=identidade, partial=True)
                serializer.is_valid(raise_exception=True)
                serializer.save()
                return Response({"success": True, "result": serializer.data})

            serializer = CidadaoSerializer(data=identidade)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(
                {"success": True, "result": serializer.data},
                status=status.HTTP_201_CREATED,
            )
        except ValidationError as exc:
            return Response(
                {
                    "success": False,
                    "errors": exc.detail,
                    "result": "Não foi possível validar o cadastro.",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class CidadaoSSORetrieveView(APIView):
    authentication_classes = [SSOAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        cpf = identidade.get("cpf")
        email = identidade.get("email")

        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        existente = None
        if cpf:
            existente = Cidadao.objects.filter(cpf=cpf).first()
        if not existente and email:
            existente = Cidadao.objects.filter(email=email).first()

        if not existente:
            return Response({"success": True, "result": None}, status=status.HTTP_200_OK)

        serializer = CidadaoListDetailSerializer(existente, context={"request": request})
        return Response({"success": True, "result": serializer.data}, status=status.HTTP_200_OK)


class SSORefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get("refresh_token")
        if not refresh_token:
            refresh_token = request.COOKIES.get("refresh_token_fod")
        access_token, error = refresh_access_token_from_cookie(refresh_token)
        if error:
            return Response(
                {"success": False, "result": error},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return Response(
            {"success": True, "result": {"access_token": access_token}},
            status=status.HTTP_200_OK,
        )


class SSOFodLogoutView(APIView):
    authentication_classes = [SSOAuthentication]
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        refresh_token = request.COOKIES.get("refresh_token_fod")
        if not refresh_token:
            return Response(
                {"success": False, "result": "Refresh token ausente no cookie."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        access_token = getattr(request, "sso_access_token", None)
        if access_token and f"token-{SS_EXT}" not in request.session:
            request.session[f"token-{SS_EXT}"] = access_token
        request.session[f"refresh_token-{SS_EXT}"] = refresh_token

        if not request.session.get("id_token"):
            id_token = request.COOKIES.get("id_token")
            if not id_token and request.data:
                id_token = request.data.get("id_token")
            if id_token:
                request.session["id_token"] = id_token

        success = fd_logout(request)
        if success:
            resp = Response(
                {"success": True, "result": True}, status=status.HTTP_200_OK
            )
            resp.delete_cookie(
                key="refresh_token_fod",
                path="/",
                samesite=samesite_cookie,
            )
            resp.delete_cookie(
                key="id_token",
                path="/",
                samesite=samesite_cookie,
            )
            return resp


class SSOProfileView(APIView):
    authentication_classes = [SSOAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, *args, **kwargs):
        access_token = getattr(request, "sso_access_token", None)
        token_parsed = getattr(request, "sso_token_parsed", None)
        perfil = get_cadastro_from_token(access_token, token_parsed)
        result = perfil if perfil else (token_parsed or {})
        result = _normalize_profile_name(result)
        return Response({"success": True, "result": result}, status=status.HTTP_200_OK)


class SSOPessoaBaseView(APIView):
    authentication_classes = [SSOAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, cpf, *args, **kwargs):
        access_token = getattr(request, "sso_access_token", None)
        token_parsed = getattr(request, "sso_token_parsed", None) or {}
        cpf_token = str(token_parsed.get("preferred_username") or "").strip()
        cpf_param = str(cpf or "").strip()

        if not cpf_param:
            return Response(
                {"success": False, "result": "CPF não informado."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Evita consultar dados de outro cidadão com o mesmo token de sessão.
        if cpf_token and cpf_token != cpf_param:
            return Response(
                {"success": False, "result": "CPF não corresponde ao usuário autenticado."},
                status=status.HTTP_403_FORBIDDEN,
            )

        perfil = get_cadastro_base_from_token(access_token, cpf_param)
        if not perfil:
            return Response({"success": True, "result": None}, status=status.HTTP_200_OK)

        return Response(
            {"success": True, "result": _normalize_profile_name(perfil)},
            status=status.HTTP_200_OK,
        )


class CidadaoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Cidadao.objects.all()
    serializer_class = CidadaoSerializer

    def get_serializer_class(self):
        if self.request.method == "GET":
            return CidadaoListDetailSerializer
        return CidadaoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Cidadão não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().handle_exception(exc)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "result": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = request.method == "PATCH"
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
      
        if not serializer.is_valid():
         print("ERRO DE VALIDAÇÃO:", serializer.errors)
         return Response(
            {"success": False, "errors": serializer.errors},
            status=400
        )

        changes = self._get_changes(instance, serializer.validated_data)
        self.perform_update(serializer)
        print(serializer.data)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Cidadão com Id {kwargs['pk']} removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )

    def _get_changes(self, instance, new_data):
        changes = {}
        for field, new_value in new_data.items():
            old_value = getattr(instance, field, None)
            if old_value != new_value:
                changes[field] = {"antes": old_value, "depois": new_value}
        return changes
