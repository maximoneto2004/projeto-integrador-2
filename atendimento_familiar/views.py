from django.shortcuts import render
from app.permissions import DjangoModelPermissionsWithView
from rest_framework import generics, status, permissions, filters
from atendimento_familiar.models import MembroFamiliar, FichaAtendimentoFamiliar
from atendimento_familiar.serializers import (
    MembroFamiliarSerializer,
    MembroFamiliarListDetailSerializer,
    FichaAtendimentoFamiliarSerializer,
    FichaAtendimentoFamiliarListDetailSerializer,
)
from atendimento_familiar.filters import (
    MembroFamiliarFilter,
    FichaAtendimentoFamiliarFilter,
)
from django_filters.rest_framework import DjangoFilterBackend
from django.http import Http404
from rest_framework.response import Response


# Create your views here.
class MembroFamiliarListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = MembroFamiliar.objects.all()
    serializer_class = MembroFamiliarSerializer
    filterset_class = MembroFamiliarFilter
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return MembroFamiliarListDetailSerializer
        return MembroFamiliarSerializer

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


class MembroFamiliarRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = MembroFamiliar.objects.all()
    serializer_class = MembroFamiliarSerializer

    def get_serializer_class(self):
        if self.request.method == "GET":
            return MembroFamiliarListDetailSerializer
        return MembroFamiliarSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Membro Familiar não encontrado."},
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
                "result": f"Membro Familiar com Id {kwargs['pk']} removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class FichaAtendimentoFamiliarListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = FichaAtendimentoFamiliar.objects.all()
    serializer_class = FichaAtendimentoFamiliarSerializer
    filterset_class = FichaAtendimentoFamiliarFilter
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return FichaAtendimentoFamiliarListDetailSerializer
        return FichaAtendimentoFamiliarSerializer

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


class FichaAtendimentoFamiliarRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = FichaAtendimentoFamiliar.objects.all()
    serializer_class = FichaAtendimentoFamiliarSerializer

    def get_serializer_class(self):
        if self.request.method == "GET":
            return FichaAtendimentoFamiliarListDetailSerializer
        return FichaAtendimentoFamiliarSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {
                    "success": False,
                    "result": "Ficha de Atendimento Familiar não encontrada.",
                },
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
                "result": f"Ficha de Atendimento Familiar com Id {kwargs['pk']} removida com sucesso.",
            },
            status=status.HTTP_200_OK,
        )
