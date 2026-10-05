import uuid

from django.db.models import ProtectedError
from django.http import Http404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from app.permissions import DjangoModelPermissionsWithView, EscritaSomenteAdministrador
from medicamentos import services
from medicamentos.filters import LoteMedicamentoFilter, MedicamentoFilter, MovimentacaoEstoqueFilter
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from medicamentos.serializers import (
    DispensacaoSerializer,
    LoteMedicamentoSerializer,
    LoteMedicamentoUpdateSerializer,
    MedicamentoSerializer,
    MovimentacaoEstoqueSerializer,
)
from unidade_posto.models import UnidadePosto


PERMISSOES_MEDICAMENTO = [
    permissions.IsAuthenticated,
    EscritaSomenteAdministrador,
    DjangoModelPermissionsWithView,
]


class MedicamentoListCreateView(generics.ListCreateAPIView):
    permission_classes = PERMISSOES_MEDICAMENTO
    queryset = Medicamento.objects.all()
    serializer_class = MedicamentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = MedicamentoFilter

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({"success": True, "result": serializer.data})

        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "result": serializer.data}, status=status.HTTP_200_OK)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"success": True, "result": serializer.data}, status=status.HTTP_201_CREATED)


class MedicamentoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = PERMISSOES_MEDICAMENTO
    queryset = Medicamento.objects.all()
    serializer_class = MedicamentoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Medicamento não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().handle_exception(exc)

    def retrieve(self, request, *args, **kwargs):
        serializer = self.get_serializer(self.get_object())
        return Response({"success": True, "result": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = request.method == "PATCH"
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        try:
            self.perform_destroy(self.get_object())
        except ProtectedError:
            return Response(
                {
                    "success": False,
                    "result": "Medicamento possui lotes ou receitas vinculados e não pode ser excluído. Inative-o.",
                },
                status=status.HTTP_409_CONFLICT,
            )
        return Response(
            {"success": True, "result": "Medicamento removido com sucesso."},
            status=status.HTTP_200_OK,
        )


PERMISSOES_ESTOQUE = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]


def _resposta_lista(view, queryset):
    page = view.paginate_queryset(queryset)
    if page is not None:
        serializer = view.get_serializer(page, many=True)
        return view.get_paginated_response({"success": True, "result": serializer.data})
    serializer = view.get_serializer(queryset, many=True)
    return Response({"success": True, "result": serializer.data}, status=status.HTTP_200_OK)


def _filtrar_por_unidades(queryset, user, campo_unidade):
    permitidas = services.unidades_permitidas(user)
    if permitidas is None:
        return queryset
    return queryset.filter(**{f"{campo_unidade}__in": permitidas})


class LoteMedicamentoListCreateView(generics.ListCreateAPIView):
    permission_classes = PERMISSOES_ESTOQUE
    pagination_class = LimitOffsetPagination
    queryset = LoteMedicamento.objects.all()
    serializer_class = LoteMedicamentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = LoteMedicamentoFilter

    def get_queryset(self):
        queryset = LoteMedicamento.objects.select_related("medicamento", "unidade")
        return _filtrar_por_unidades(queryset, self.request.user, "unidade")

    def list(self, request, *args, **kwargs):
        return _resposta_lista(self, self.filter_queryset(self.get_queryset()))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"success": True, "result": serializer.data}, status=status.HTTP_201_CREATED)


class LoteMedicamentoRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = PERMISSOES_ESTOQUE
    queryset = LoteMedicamento.objects.all()
    serializer_class = LoteMedicamentoUpdateSerializer

    def get_queryset(self):
        queryset = LoteMedicamento.objects.select_related("medicamento", "unidade")
        return _filtrar_por_unidades(queryset, self.request.user, "unidade")

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Lote não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return super().handle_exception(exc)

    def retrieve(self, request, *args, **kwargs):
        return Response({"success": True, "result": self.get_serializer(self.get_object()).data})

    def update(self, request, *args, **kwargs):
        partial = request.method == "PATCH"
        serializer = self.get_serializer(self.get_object(), data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})


class MovimentacaoEstoqueListCreateView(generics.ListCreateAPIView):
    permission_classes = PERMISSOES_ESTOQUE
    pagination_class = LimitOffsetPagination
    queryset = MovimentacaoEstoque.objects.all()
    serializer_class = MovimentacaoEstoqueSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = MovimentacaoEstoqueFilter

    def get_queryset(self):
        queryset = MovimentacaoEstoque.objects.select_related(
            "lote", "lote__medicamento", "lote__unidade", "usuario"
        )
        return _filtrar_por_unidades(queryset, self.request.user, "lote__unidade")

    def list(self, request, *args, **kwargs):
        return _resposta_lista(self, self.filter_queryset(self.get_queryset()))

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response({"success": True, "result": serializer.data}, status=status.HTTP_201_CREATED)


class DispensacaoView(APIView):
    permission_classes = PERMISSOES_ESTOQUE
    queryset = MovimentacaoEstoque.objects.all()

    def post(self, request):
        entrada = DispensacaoSerializer(data=request.data)
        entrada.is_valid(raise_exception=True)
        movimentacoes = services.dispensar(request.user, **entrada.validated_data)
        return Response(
            {"success": True, "result": MovimentacaoEstoqueSerializer(movimentacoes, many=True).data},
            status=status.HTTP_201_CREATED,
        )


def _uuid_do_parametro(request, nome):
    valor = request.query_params.get(nome)
    if not valor:
        return None
    try:
        return uuid.UUID(valor)
    except ValueError:
        raise ValidationError({nome: "Identificador inválido."})


def _unidades_da_consulta(request):
    permitidas = services.unidades_permitidas(request.user)
    unidade_id = _uuid_do_parametro(request, "unidade")
    if not unidade_id:
        return permitidas
    base = UnidadePosto.objects.all() if permitidas is None else permitidas
    return base.filter(pk=unidade_id)


class SaldoEstoqueView(APIView):
    permission_classes = PERMISSOES_ESTOQUE
    queryset = LoteMedicamento.objects.all()

    def get(self, request):
        saldos = services.calcular_saldos(
            _unidades_da_consulta(request), medicamento_id=_uuid_do_parametro(request, "medicamento")
        )
        return Response({"success": True, "result": saldos})


class AlertasEstoqueView(APIView):
    permission_classes = PERMISSOES_ESTOQUE
    queryset = LoteMedicamento.objects.all()

    def get(self, request):
        try:
            dias = int(request.query_params.get("dias", 30))
        except ValueError:
            raise ValidationError({"dias": "Informe um número inteiro de dias."})
        alertas = services.calcular_alertas(_unidades_da_consulta(request), dias_vencimento=max(dias, 0))
        return Response(
            {
                "success": True,
                "result": {
                    "estoque_baixo": alertas["estoque_baixo"],
                    "vencendo": LoteMedicamentoSerializer(alertas["vencendo"], many=True).data,
                    "vencidos": LoteMedicamentoSerializer(alertas["vencidos"], many=True).data,
                },
            }
        )
