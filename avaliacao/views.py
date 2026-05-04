from django.shortcuts import render
from app.permissions import DjangoModelPermissionsWithView
from rest_framework import generics, status, permissions, filters
from .models import Avaliacao
from .serializers import AvaliacaoSerializer
from .filters import AvaliacaoFilters
from django_filters.rest_framework import DjangoFilterBackend
from django.http import Http404
from rest_framework.response import Response
from rest_framework.views import APIView
from cidadaos.authentication import SSOAuthentication
from rest_framework.permissions import AllowAny
from cidadaos.models import Cidadao
from cidadaos.serializers import CidadaoSerializer
from agendamentos.models import Agendamento
# Create your views here.

class AvaliacaoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Avaliacao.objects.all()
    serializer_class = AvaliacaoSerializer
    filterset_class = AvaliacaoFilters
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

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
        
        if not queryset.exists() :
            return Response({"success":True,"results":"Não há nenhuma avaliação"})

        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "results": serializer.data})
    
  
class AvaliacaoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Avaliacao.objects.all()
    serializer_class = AvaliacaoSerializer


    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Avaliação não encontrada."},
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
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Avaliação com Id {kwargs['pk']} removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )
    

class AvaliacaoSSOListCreateView(generics.ListCreateAPIView):
    authentication_classes = [SSOAuthentication]
    permission_classes = [AllowAny]
    filterset_class = AvaliacaoFilters
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    serializer_class = AvaliacaoSerializer


    def get(self, request, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        cpf = identidade.get("cpf")
        email = identidade.get("email")
        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cidadao = None
        if cpf:
            cidadao = Cidadao.objects.filter(cpf=cpf).first()
        if not cidadao and email:
            cidadao = Cidadao.objects.filter(email=email).first()

        if not cidadao:
            return Response({"success": True, "result": []})

        qs = (
            self.filter_queryset(
                Avaliacao.objects.filter(agendamento__cidadao=cidadao)
            )
            .select_related("agendamento")
            .order_by("-agendamento__data", "-agendamento__horario")
        )
        serializer = AvaliacaoSerializer(
            qs, many=True, context={"request": request}
        )
        return Response({"success": True, "result": serializer.data})


    def post(self, request, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        identidade = dict(identidade)
        identidade.setdefault("origem", "SITE")
        cpf = identidade.get("cpf")
        email = identidade.get("email")
        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cidadao = None
        if cpf:
            cidadao = Cidadao.objects.filter(cpf=cpf).first()
        if not cidadao and email:
            cidadao = Cidadao.objects.filter(email=email).first()
        if cidadao:
            cid_serializer = CidadaoSerializer(
                cidadao, data=identidade, partial=True
            )
            cid_serializer.is_valid(raise_exception=True)
            cid_serializer.save()
        else:
            cid_serializer = CidadaoSerializer(data=identidade)
            cid_serializer.is_valid(raise_exception=True)
            cidadao = cid_serializer.save()

        data = request.data.copy()
        agendamento_id = data.get("agendamento")
        if not agendamento_id:
            return Response(
                {"success": False, "result": "Agendamento é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            agendamento = Agendamento.objects.get(pk=agendamento_id, cidadao=cidadao)
        except Agendamento.DoesNotExist:
            return Response(
                {"success": False, "result": "Agendamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data["agendamento"] = str(agendamento.id)
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        headers = self.get_success_headers(serializer.data)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
            headers=headers,
        )
    

class AvaliacaoSSORetrieveUpdateView(APIView):
    authentication_classes = [SSOAuthentication]
    permission_classes = [AllowAny]

    def get(self, request, pk, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        cpf = identidade.get("cpf")
        email = identidade.get("email")
        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cidadao = None
        if cpf:
            cidadao = Cidadao.objects.filter(cpf=cpf).first()
        if not cidadao and email:
            cidadao = Cidadao.objects.filter(email=email).first()
        if not cidadao:
            return Response(
                {"success": False, "result": "Cidadão não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            avaliacao = Avaliacao.objects.select_related("agendamento").get(
                pk=pk, agendamento__cidadao=cidadao
            )
        except Avaliacao.DoesNotExist:
            return Response(
                {"success": False, "result": "Avaliação não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = AvaliacaoSerializer(avaliacao, context={"request": request})
        return Response({"success": True, "result": serializer.data})

    def patch(self, request, pk, *args, **kwargs):
        identidade = getattr(request, "sso_identity", None) or {}
        cpf = identidade.get("cpf")
        email = identidade.get("email")
        if not cpf and not email:
            return Response(
                {"success": False, "result": "CPF ou email é obrigatório."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        cidadao = None
        if cpf:
            cidadao = Cidadao.objects.filter(cpf=cpf).first()
        if not cidadao and email:
            cidadao = Cidadao.objects.filter(email=email).first()
        if not cidadao:
            return Response(
                {"success": False, "result": "Cidadão não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            avaliacao = Avaliacao.objects.select_related("agendamento").get(
                pk=pk, agendamento__cidadao=cidadao
            )
        except Avaliacao.DoesNotExist:
            return Response(
                {"success": False, "result": "Avaliação não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        data = request.data.copy()
        data["agendamento"] = str(avaliacao.agendamento_id)
        serializer = AvaliacaoSerializer(
            avaliacao, data=data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({"success": True, "result": serializer.data})
