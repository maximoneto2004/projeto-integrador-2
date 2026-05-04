from django.shortcuts import render
from rest_framework import generics, status, permissions
from servicos.models import Servico, ClasseServico, TipoServico
from servicos.filters import ServicoFilter, ClasseServicoFilter, TipoServicoFilter
from servicos.serializers import (
    ServicoSerializer,
    ServicoListDetailSerializer,
    ClasseServicoSerializer,
    TipoServicoSerializer,
)
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.http import Http404
from app.permissions import DjangoModelPermissionsWithView


class ServicoListCreateApiView(generics.ListCreateAPIView):
    queryset = Servico.objects.all()
    serializer_class = ServicoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ServicoFilter

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), DjangoModelPermissionsWithView()]

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ServicoListDetailSerializer
        return ServicoSerializer

    def get_queryset(self):
        queryset = Servico.objects.all()
        if self.request.method == "GET":
            queryset = queryset.select_related("classe", "tipo_servico")
        return queryset

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset()).distinct().order_by("nome")
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)

            if not serializer.data:
                return self.get_paginated_response({
                    "success": False,
                    "result": "Nenhum serviço encontrado",
                })

            return self.get_paginated_response({
                "success": True,
                "result": serializer.data,
            })

        serializer = self.get_serializer(queryset, many=True)
        if not serializer.data:
            return Response(
                {"success": False, "result": "Nenhum serviço encontrado"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_200_OK,
        )   

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(
            {"success": True, "result": serializer.data}, status=status.HTTP_201_CREATED
        )


class ServicoRetriveUpdatedDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Servico.objects.all()
    serializer_class = ServicoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ServicoFilter


    def get_serializer_class(self):
        if self.request.method == "GET":
            return ServicoListDetailSerializer
        return ServicoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "serviço não encontrado"},
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
            detail = serializer.errors
            message = detail
            if isinstance(detail, dict):
                first_key = next(iter(detail.keys()), None)
                if first_key is not None:
                    value = detail[first_key]
                    if isinstance(value, (list, tuple)) and value:
                        message = value[0]
                    else:
                        message = value
            return Response(
                {"success": False, "result": str(message)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.is_valid(raise_exception=True)
        service_name = serializer.validated_data.get("nome", "")
        description = serializer.validated_data.get("descricao", "")
        if service_name and len(service_name) > 150:
            return Response({
                "success": False,
                "result": "O nome do serviço deve conter no máximo 150 caracteres."
            }, status=status.HTTP_400_BAD_REQUEST)
        if description and len(description) > 255:
            return Response({
                "success": False,
                "result": "A descrição do serviço deve conter no máximo 255 caracteres."
            }, status=status.HTTP_400_BAD_REQUEST)
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"Serviço removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class ClasseServicoListCreate(generics.ListCreateAPIView):
    queryset = ClasseServico.objects.all()
    serializer_class = ClasseServicoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = ClasseServicoFilter

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), DjangoModelPermissionsWithView()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset()).order_by("nome")
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)

            if not serializer.data:
                return self.get_paginated_response({
                    "success": False,
                    "result": "Nenhuma classe de serviço encontrado",
                })

            return self.get_paginated_response({
                "success": True,
                "result": serializer.data,
            })

        serializer = self.get_serializer(queryset, many=True)
        if not serializer.data:
            return Response(
                {"success": False, "result": "Nenhuma classe de serviço encontrado"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_200_OK,
        )


    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            detail = serializer.errors
            message = detail
            if isinstance(detail, dict):
                first_key = next(iter(detail.keys()), None)
                if first_key is not None:
                    value = detail[first_key]
                    if isinstance(value, (list, tuple)) and value:
                        message = value[0]
                    else:
                        message = value
            return Response(
                {"success": False, "result": str(message)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)

        return Response(
            {"success": True, "result": serializer.data}, status=status.HTTP_201_CREATED
        )


class ClasseServicoRetriveUpdatedDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ClasseServico.objects.all()
    serializer_class = ClasseServicoSerializer

    
    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "classe serviço não encontrada"},
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
            detail = serializer.errors
            message = detail
            if isinstance(detail, dict):
                first_key = next(iter(detail.keys()), None)
                if first_key is not None:
                    value = detail[first_key]
                    if isinstance(value, (list, tuple)) and value:
                        message = value[0]
                    else:
                        message = value
            return Response(
                {"success": False, "result": str(message)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.is_valid(raise_exception=True)
        nome = serializer.validated_data.get("nome", "")
        descricao = serializer.validated_data.get("descricao", "")
        if descricao and len(descricao) > 255:
            return Response({
                "success": False,
                "result": "A descrição da classe de serviço deve conter no máximo 255 caracteres.",
            },
            status=status.HTTP_400_BAD_REQUEST
            )
        
        if nome and len(nome) > 150:
            return Response({
                "success": False,
                "result": "O nome da classe de serviço deve conter no máximo 150 caracteres.",
            },
            status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": f"classe removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class TipoServicoListCreate(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = TipoServico.objects.all()
    serializer_class = TipoServicoSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = TipoServicoFilter

    def _validate_tipo_servico_unique(self, tipo_servico_nome: str) -> bool:
        return TipoServico.objects.filter(nome__iexact=tipo_servico_nome).exists()


    def get_serializer_class(self):
        return TipoServicoSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset()).order_by("nome")
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)

            if not serializer.data:
                return self.get_paginated_response({
                    "success": False,
                    "result": "Nenhum tipo de serviço encontrado",
                })

            return self.get_paginated_response({
                "success": True,
                "result": serializer.data,
            })

        serializer = self.get_serializer(queryset, many=True)
        if not serializer.data:
            return Response(
                {"success": False, "result": "Nenhum tipo de serviço encontrado"},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_200_OK,
        )

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            detail = serializer.errors
            message = detail
            if isinstance(detail, dict):
                first_key = next(iter(detail.keys()), None)
                if first_key is not None:
                    value = detail[first_key]
                    if isinstance(value, (list, tuple)) and value:
                        message = value[0]
                    else:
                        message = value
            return Response(
                {"success": False, "result": str(message)},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class TipoServicoRetrieveUpdatedDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = TipoServico.objects.all()
    serializer_class = TipoServicoSerializer


    def get_serializer_class(self):
        return TipoServicoSerializer

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "tipo de serviço não encontrado"},
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
        service_name = serializer.validated_data.get("nome", "")
        if service_name and len(service_name) > 150:
            return Response({
                "success": False,
                "result": "O nome do tipo de serviço deve conter no máximo 150 caracteres.",
            },
            status=status.HTTP_400_BAD_REQUEST
            )
        self.perform_update(serializer)
        return Response({"success": True, "result": serializer.data})

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {
                "success": True,
                "result": "tipo de serviço removido com sucesso.",
            },
            status=status.HTTP_200_OK,
        )
