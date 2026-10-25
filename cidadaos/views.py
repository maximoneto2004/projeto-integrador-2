from django.http import Http404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.utils import datetime_from_epoch

from app.permissions import DjangoModelPermissionsWithView

from .autenticacao import CidadaoAccessToken, LimiteEnvioPorCpfHora, LimiteEnvioPorCpfMinuto
from .filters import CidadaoFilter
from .models import Cidadao
from .serializers import (
    CidadaoListDetailSerializer,
    CidadaoSerializer,
    ConfirmarVerificacaoSerializer,
    IniciarVerificacaoSerializer,
)
from .verificacao import confirmar_verificacao, iniciar_verificacao


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


class IniciarVerificacaoView(APIView):
    """Rota pública: envia um código de verificação para o e-mail cadastrado do cidadão."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LimiteEnvioPorCpfMinuto, LimiteEnvioPorCpfHora]

    def post(self, request):
        entrada = IniciarVerificacaoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        verificacao_id, expira_em = iniciar_verificacao(entrada.validated_data["cpf"])
        return Response(
            {
                "success": True,
                "result": {
                    "mensagem": "Se o CPF estiver cadastrado com e-mail, um código de verificação foi enviado.",
                    "verificacao_id": str(verificacao_id),
                    "expira_em": expira_em,
                },
            },
            status=status.HTTP_202_ACCEPTED,
        )


class ConfirmarVerificacaoView(APIView):
    """Rota pública: confirma o código recebido por e-mail e devolve o token de acesso do cidadão."""

    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        entrada = ConfirmarVerificacaoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        cidadao = confirmar_verificacao(**entrada.validated_data)
        token = CidadaoAccessToken.para_cidadao(cidadao)
        return Response(
            {
                "success": True,
                "result": {
                    "access": str(token),
                    "expira_em": datetime_from_epoch(token["exp"]),
                    "cidadao": {"id": str(cidadao.id), "nome": cidadao.nome},
                },
            }
        )
