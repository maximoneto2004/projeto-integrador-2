from django.http import Http404
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from app.permissions import DjangoModelPermissionsWithView
from cidadaos.models import Cidadao
from prontuario.filters import ReceitaFilter, RegistroAtendimentoFilter
from prontuario.models import Receita, RegistroAtendimento
from prontuario.serializers import (
    CidadaoProntuarioSerializer,
    DadosClinicosCidadaoSerializer,
    ReceitaSerializer,
    RegistroAtendimentoSerializer,
)

PERMISSOES_PADRAO = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]


class ReceitaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Receita.objects.select_related("cidadao", "profissional", "agendamento").prefetch_related(
        "medicamentos__medicamento"
    )
    serializer_class = ReceitaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ReceitaFilter
    pagination_class = LimitOffsetPagination

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return Response(
                {
                    "success": bool(serializer.data),
                    "count": paginator.count,
                    "next": paginator.get_next_link(),
                    "previous": paginator.get_previous_link(),
                    "result": serializer.data,
                },
                status=status.HTTP_200_OK,
            )
        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"success": True, "result": serializer.data}, status=status.HTTP_201_CREATED)


class ReceitaRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Receita.objects.select_related("cidadao", "profissional", "agendamento").prefetch_related(
        "medicamentos__medicamento"
    )
    serializer_class = ReceitaSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Receita não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().handle_exception(exc)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return Response({"success": True, "result": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = request.method == "PATCH"
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.possui_dispensacao:
            return Response(
                {"success": False, "result": "A receita já teve medicamentos dispensados e não pode ser removida."},
                status=status.HTTP_409_CONFLICT,
            )
        self.perform_destroy(instance)
        return Response({"success": True, "result": "Receita removida com sucesso."}, status=status.HTTP_200_OK)


def _registros_queryset():
    return RegistroAtendimento.objects.select_related("profissional", "unidade", "agendamento__servico")


class RegistroAtendimentoListCreateView(generics.ListCreateAPIView):
    permission_classes = PERMISSOES_PADRAO
    queryset = RegistroAtendimento.objects.all()
    serializer_class = RegistroAtendimentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = RegistroAtendimentoFilter

    def get_queryset(self):
        return _registros_queryset()

    def list(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.filter_queryset(self.get_queryset()), many=True)
        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"success": True, "result": serializer.data}, status=status.HTTP_201_CREATED)


class RegistroAtendimentoRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """Registros clínicos não são excluídos; só o autor pode editar."""

    permission_classes = PERMISSOES_PADRAO
    queryset = RegistroAtendimento.objects.all()
    serializer_class = RegistroAtendimentoSerializer

    def get_queryset(self):
        return _registros_queryset()

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Registro de atendimento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().handle_exception(exc)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "result": self.get_serializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.profissional_id != request.user.id and not request.user.is_superuser:
            raise PermissionDenied("Somente o profissional que fez o registro pode alterá-lo.")
        serializer = self.get_serializer(instance, data=request.data, partial=request.method == "PATCH")
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})


class ProntuarioCidadaoView(APIView):
    """Prontuário do paciente: dados clínicos, atendimentos e receitas, do mais recente ao mais antigo."""

    permission_classes = PERMISSOES_PADRAO
    queryset = RegistroAtendimento.objects.all()

    def get(self, request, cidadao_id):
        cidadao = get_object_or_404(Cidadao, pk=cidadao_id)
        atendimentos = _registros_queryset().filter(cidadao=cidadao)
        receitas = (
            Receita.objects.filter(cidadao=cidadao)
            .select_related("profissional", "cidadao")
            .prefetch_related("medicamentos__medicamento")
        )
        return Response(
            {
                "success": True,
                "result": {
                    "cidadao": CidadaoProntuarioSerializer(cidadao).data,
                    "atendimentos": RegistroAtendimentoSerializer(atendimentos, many=True).data,
                    "receitas": ReceitaSerializer(receitas, many=True).data,
                },
            }
        )


class DadosClinicosCidadaoView(APIView):
    permission_classes = PERMISSOES_PADRAO
    # PATCH exige change_registroatendimento: só profissionais de saúde editam dados clínicos.
    queryset = RegistroAtendimento.objects.all()

    def patch(self, request, cidadao_id):
        cidadao = get_object_or_404(Cidadao, pk=cidadao_id)
        serializer = DadosClinicosCidadaoSerializer(cidadao, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"success": True, "result": CidadaoProntuarioSerializer(cidadao).data})
