from django.db.models import Q
from django.http import Http404
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, permissions, status
from rest_framework.pagination import LimitOffsetPagination
from rest_framework.response import Response

from app.permissions import DjangoModelPermissionsWithView
from encaminhamentos.filters import CodigoAreaFilter, EncaminhamentoFilter
from encaminhamentos.models import CodigoArea, Encaminhamento
from encaminhamentos.serializers import (
    CodigoAreaSerializer,
    EncaminhamentoListDetailSerializer,
    EncaminhamentoSerializer,
)


class CodigoAreaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CodigoArea.objects.all()
    serializer_class = CodigoAreaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = CodigoAreaFilter
    pagination_class = LimitOffsetPagination

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
        search = (request.query_params.get("search") or "").strip()
        if search:
            if search.isdigit():
                queryset = queryset.filter(
                    Q(nome__icontains=search) | Q(codigo=int(search)),
                )
            else:
                queryset = queryset.filter(nome__icontains=search)

        queryset = queryset.order_by("codigo", "nome")

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


class CodigoAreaRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = CodigoArea.objects.all()
    serializer_class = CodigoAreaSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Código de área não encontrado."},
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
            {"success": True, "result": "Código de área removido com sucesso."},
            status=status.HTTP_200_OK,
        )


class EncaminhamentoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Encaminhamento.objects.all()
    serializer_class = EncaminhamentoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = EncaminhamentoFilter

    def get_serializer_class(self):
        if self.request.method == "GET":
            return EncaminhamentoListDetailSerializer
        return EncaminhamentoSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print(
                "[DEBUG][Encaminhamento POST] Erro de validação:",
                serializer.errors,
                "Payload:",
                request.data,
            )
            return Response(
                {"success": False, "result": serializer.errors},
                status=status.HTTP_400_BAD_REQUEST,
            )

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
            return self.get_paginated_response({"success": True, "results": serializer.data})

        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "results": serializer.data})


class EncaminhamentoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Encaminhamento.objects.all()
    serializer_class = EncaminhamentoSerializer

    def get_serializer_class(self):
        if self.request.method == "GET":
            return EncaminhamentoListDetailSerializer
        return EncaminhamentoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Encaminhamento não encontrado."},
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
            {"success": True, "result": "Encaminhamento removido com sucesso."},
            status=status.HTTP_200_OK,
        )
