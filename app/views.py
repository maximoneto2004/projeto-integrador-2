from django.views.generic import TemplateView
from cidadaos.requests_fd import get_valid_token_or_none, check_auth_sso, logout
from django.shortcuts import redirect
from rest_framework import generics, status, permissions
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from django.http import Http404
from django_filters.rest_framework import DjangoFilterBackend
from .models import Bairro
from .serializers import BairroSerializer, FaleConoscoSerializer
from .filters import BairroFilter
from app.permissions import DjangoModelPermissionsWithView
from utils.email import send_email_in_thread
import os

RHSSO_URL_BASE = "https://sso-rhsso-hom.apps.np-ocp.fortaleza.ce.gov.br"
REALM = "pmf"
CLIENT_ID = "citinova-reciclo"
HOST = "http://localhost:8080"
REDIRECT_URI = HOST + "/login-sso"


class IndexView(TemplateView):
    template_name = "app/index.html"


def login(request):
    token_parsed = get_valid_token_or_none(request)
    if token_parsed:
        print(token_parsed)
    else:
        return redirect(
            RHSSO_URL_BASE
            + "/auth/realms/"
            + REALM
            + "/protocol/openid-connect/auth?response_type=code&"
            "client_id=" + CLIENT_ID + "&scope=openid" + "&redirect_uri=" + REDIRECT_URI
        )
        check_auth_sso(request)
    return redirect("index")


def logout_sso(request):
    logout(request)
    return redirect("/")


class BairroListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Bairro.objects.all()
    serializer_class = BairroSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = BairroFilter
    pagination_class = LimitOffsetPagination

    def _validate_bairro_unique(self, bairro_nome: str) -> bool:
        return Bairro.objects.filter(nome__iexact=bairro_nome).exists()


    def get_serializer_class(self):
        return BairroSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)

            if not serializer.data:
                return self.get_paginated_response({
                    "success": False,
                    "result": "Nenhum bairro encontrado",
                })

            return self.get_paginated_response({
                "success": True,
                "result": serializer.data,
            })

        serializer = self.get_serializer(queryset, many=True)
        if not serializer.data:
            return Response(
                {"success": False, "result": "Nenhum bairro encontrado"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_200_OK,
        )


    def create(self, request, *args, **kwargs):
        bairro_nome = request.data.get("nome").strip()
        if self._validate_bairro_unique(bairro_nome):
            return Response(
                {"success": False, "result": "Já existe um bairro cadastrado com esse nome."}, status=status.HTTP_400_BAD_REQUEST,
                )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class BairroRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Bairro.objects.all()
    serializer_class = BairroSerializer

    def get_serializer_class(self):
        return BairroSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Bairro não encontrado."},
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
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()

        return Response(
            {"success": True, "result": "Bairro removido com sucesso."},
            status=status.HTTP_204_NO_CONTENT,
        )

class FaleConoscoView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = FaleConoscoSerializer

    def _valid_nome_length(nome: str):
        if len(nome) > 150:
            return Response({
                "success": False,
                "result": "O nome completo deve conter no máximo 150 caracteres."
            }, status=status.HTTP_400_BAD_REQUEST)
            

    def _prepare_email(email_data:dict):
        nome = email_data.get('nome_completo')
        email = email_data.get('email')
        assunto = email_data.get('assunto')
        mensagem = email_data.get('mensagem')
        message_sent = f'{nome}<br>{mensagem}'
        return [nome, email, assunto, message_sent]


    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            content = FaleConoscoView._prepare_email(request.data)
            send_email_in_thread(
                os.getenv('EMAIL_HOST_USER'), 
                content[2],
                'Mensagem do Portal Agendamento CRAS',
                content[3],
                content[1])
            
            return Response(
                {"success": True, "result": "Mensagem enviada com sucesso."},
                status=status.HTTP_200_OK,
            )
        return Response({"success": False, "result": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)
    
