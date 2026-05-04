from django.shortcuts import render
from rest_framework import generics, status, permissions
from duvidas_frequentes.serializers import DuvidaSerializer
from duvidas_frequentes.models import Duvida
from rest_framework.response import Response
from django.http import Http404
from django_filters.rest_framework import DjangoFilterBackend
from .filters import DuvidaFilter
from app.permissions import DjangoModelPermissionsWithView

class DuvidaPerguntaListCreateView(generics.ListCreateAPIView):
    queryset = Duvida.objects.all()
    serializer_class = DuvidaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class =DuvidaFilter
   
    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), DjangoModelPermissionsWithView()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)

            if not serializer.data:
                return self.get_paginated_response({
                    "success": False,
                    "result": "Nenhuma dúvida encontrada!",
                })

            return self.get_paginated_response({
                "success": True,
                "result": serializer.data,
            })

        serializer = self.get_serializer(queryset, many=True)

        if not serializer.data:
            return Response(
                {"success": False, "result": "Nenhuma dúvida encontrada!"},
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

class DuvidaPerguntaRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Duvida.objects.all()
    serializer_class = DuvidaSerializer
    
    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Dúvida ou pergunta não encontrada."},
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


    