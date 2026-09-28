from django.http import Http404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from app.permissions import DjangoModelPermissionsWithView, EscritaSomenteAdministrador
from medicamentos.filters import MedicamentoFilter
from medicamentos.models import Medicamento
from medicamentos.serializers import MedicamentoSerializer


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
        self.perform_destroy(self.get_object())
        return Response(
            {"success": True, "result": "Medicamento removido com sucesso."},
            status=status.HTTP_200_OK,
        )
