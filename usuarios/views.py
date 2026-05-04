from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group
from django.db import transaction, IntegrityError
from django.db.models import ProtectedError
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from agendamentos.models import Agendamento
from unidade_cras.models import Guiche
from app.permissions import DjangoModelPermissionsWithView
from usuarios.filters import EscalaTrabalhoFilter, UsuarioFilter, GuicheFilter
from usuarios.models import EscalaTrabalho, Usuario
from .serializers import (
    EscalaTrabalhoSimpleSerializer,
    GroupSerializer,
    GuicheSerializer,
    GuicheUpdateSerializer,
    UsuarioSerializer,
    EscalaTrabalhoListDetailSerializer,
    UsuarioListDetailSerializer,
)

User = get_user_model()

class GuichesDisponiveisView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = GuicheSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = GuicheFilter

    def get_queryset(self):
        user = self.request.user
        unidades_escalas_ativas = user.escalas.filter(is_active=True).values_list(
            "unidade_id", flat=True
        )
        guiches_ocupados = (
            User.objects.filter(is_active=True, guiche_atual__isnull=False)
            # RESPONSAVEL POR MOSTRAR O OCUPADO COMO FALSE MESMO SE O SEU USUARIO ESTIVER ATRIBUIDO A UM GUICHE
            .exclude(id=user.id)
            .values_list("guiche_atual_id", flat=True)
        )
        self.guiches_ocupados_set = set(guiches_ocupados)
        return Guiche.objects.filter(
            unidade_id__in=unidades_escalas_ativas, is_active=True
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["guiches_ocupados_set"] = getattr(self, "guiches_ocupados_set", set())
        return context


class GuicheListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Guiche.objects.all()
    filter_backends = [DjangoFilterBackend]
    filterset_class = GuicheFilter

    def get_queryset(self):
        return Guiche.objects.select_related("unidade").all()

    def get_serializer_class(self):
        if self.request.method == "GET":
            return GuicheSerializer
        return GuicheUpdateSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        guiches_ocupados = User.objects.filter(
            is_active=True, guiche_atual__isnull=False
        ).values_list("guiche_atual_id", flat=True)
        context["guiches_ocupados_set"] = set(guiches_ocupados)
        return context

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)

            if not serializer.data:
                return self.get_paginated_response({
                    "success": False,
                    "result": "Nenhum guichê encontrado",
                })

            return self.get_paginated_response({
                "success": True,
                "result": serializer.data,
            })

        serializer = self.get_serializer(queryset, many=True)
        if not serializer.data:
            return Response(
                {"success": False, "result": "Nenhum guichê encontrado"},
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
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class GuicheRetrieveUpdateView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = GuicheUpdateSerializer
    queryset = Guiche.objects.all()

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        try:
            self.perform_destroy(instance)
            return Response(
                {"success": True, "result": "Guichê deletado com sucesso."},
                status=status.HTTP_204_NO_CONTENT,
            )
        except (IntegrityError, ProtectedError):
            return Response(
                {"success": False, "result": "Não é possível deletar o guichê. Verifique se ele está ocupado!"}, status=status.HTTP_409_CONFLICT,
            )

class LiberaGuicheView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = GuicheSerializer
    queryset = Guiche.objects.all()

    def post(self, request, *args, **kwargs):
        guiche_id = request.data.get("guiche_id")
        if not guiche_id:
            return Response({"detail": "Informe o guiche_id."}, status=status.HTTP_400_BAD_REQUEST)
        atendente = Usuario.objects.filter(guiche_atual_id=guiche_id, is_active=True).first()
        if atendente:
            print(atendente, " atendente")
            agendamento_em_aberto = Agendamento.objects.filter(
                atendente=atendente,
                situacao__in=["CHAMANDO", "ATENDIMENTO"],
            ).first()
            print(agendamento_em_aberto, " agendamento")
            if agendamento_em_aberto:
                return Response(
                    {
                        "detail": "Não é possível liberar o guichê. O atendente possui agendamento em CHAMANDO ou ATENDIMENTO."
                    },
                    status=status.HTTP_409_CONFLICT,
                )
            atendente.guiche_atual = None
            atendente.save()
            return Response({"detail": "Guichê liberado com sucesso."}, status=status.HTTP_200_OK)
        else:
            return Response({"detail": "Guichê já está livre."}, status=status.HTTP_200_OK)

    
class DefinirGuicheAtualView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GuicheSerializer
    queryset = Guiche.objects.all()

    def post(self, request, *args, **kwargs):
        guiche_id = request.data.get("guiche_id")
        if not guiche_id:
            return Response({"detail": "Informe o guiche_id."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            guiche = Guiche.objects.get(id=guiche_id, is_active=True)
        except Guiche.DoesNotExist:
            return Response({"detail": "Guichê não encontrado ou inativo."},status=status.HTTP_404_NOT_FOUND,)

        if not request.user.unidades_lotacao.filter(id=guiche.unidade_id).exists():
            return Response({"detail": "Guichê não pertence as suas unidades de lotacao."},status=status.HTTP_403_FORBIDDEN,)
        # if guiche.unidade not in request.user.unidades_lotacao.all():
        #     return Response({"detail": "Guichê não pertence as suas unidades de lotacao."},status=status.HTTP_403_FORBIDDEN,)

        with transaction.atomic():
            try:
                guiche_locked = Guiche.objects.select_for_update().get(pk=guiche.pk)
            except Guiche.DoesNotExist:
                return Response({"detail": "Guichê não encontrado ou inativo."},status=status.HTTP_404_NOT_FOUND,)
            ocupante = (
                User.objects.filter(is_active=True, guiche_atual=guiche)
                .exclude(id=request.user.id)
                .first()
            )
            if ocupante:
                return Response({"detail": f"Guichê indisponível no momento. Ocupado por {ocupante.nome_completo}."},status=status.HTTP_409_CONFLICT,)

            request.user.guiche_atual = guiche_locked
            request.user.save(update_fields=["guiche_atual", "updated_at"])

        guiches_ocupados_set = set(
            User.objects.filter(is_active=True, guiche_atual__isnull=False).values_list(
                "guiche_atual_id", flat=True
            )
        )
        context = self.get_serializer_context()
        context["guiches_ocupados_set"] = guiches_ocupados_set
        data = self.get_serializer(guiche_locked, context=context).data
        return Response({"detail": "Guichê definido com sucesso.", "guiche": data})


class GuicheAtualView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = GuicheSerializer
    queryset = Guiche.objects.all()

    def get(self, request, *args, **kwargs):
        guiche = getattr(request.user, "guiche_atual", None)
        if not guiche:
            return Response({"detail": "Usuário não está em um guichê."}, status=404)
        data = self.get_serializer(guiche).data
        return Response({"guiche": data})


class UsuarioCreateListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = UsuarioFilter

    def get_queryset(self):
        return Usuario.objects.prefetch_related(
            "unidades_lotacao",
            "groups",
            "tipo_ofertados",
            "escalas"
        ).all()

    def _validate_user_unique(self, user_data):
        email = user_data.get("email")
        cpf = user_data.get("cpf")
        if Usuario.objects.filter(email=email).exists():
            return Response(
                {"result": "E-mail já está em uso."}, status=status.HTTP_400_BAD_REQUEST,
            )
        if Usuario.objects.filter(cpf=cpf).exists():
            return Response(
                {"result": "CPF já cadastrado."}, status=status.HTTP_400_BAD_REQUEST,
            )
        
        


    def get_serializer_class(self, *args, **kwargs):
        if self.request.method == "GET":
            return UsuarioSerializer
        return UsuarioListDetailSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if not queryset.exists():
            return Response(
                {"success": False, "result": "Nenhum usuário encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response({"success": True, "data": serializer.data})

        serializer = self.get_serializer(queryset, many=True)
        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        # if not serializer.is_valid():
        #  print("❌ ERROS:", serializer.errors)
        #  return Response(serializer.errors, status=400)
        # self._validate_user_unique(request.data)

        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class UsuarioRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

    def get_serializer_class(self):
        if self.request.method == "GET":
            return UsuarioSerializer
        return UsuarioListDetailSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        if serializer.data == {}:
            return Response(
                {"success": False, "result": "Usuário não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        guiche_sera_liberado = (
            "guiche_atual" in request.data
            and request.data.get("guiche_atual") in [None, "", "null"]
            and instance.guiche_atual_id is not None
        )
        if guiche_sera_liberado:
            agendamento_em_aberto = Agendamento.objects.filter(
                atendente=instance,
                situacao__in=["CHAMANDO", "ATENDIMENTO"],
            ).first()
            if agendamento_em_aberto:
                return Response(
                    {
                        "success": False,
                        "result": "Não é possível liberar o guichê. O atendente possui agendamento em CHAMANDO ou ATENDIMENTO.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"success": True, "result": "Usuário deletado com sucesso."},
            status=status.HTTP_204_NO_CONTENT,
        )


CARGOS_RESTRITOS = ["gestor", "coordenador"]


class GroupListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Group.objects.all()
    serializer_class = GroupSerializer

    def get_serializer_class(self, *args, **kwargs):
        return GroupSerializer

    def get_queryset(self):
        return Group.objects.exclude(name__in=CARGOS_RESTRITOS).order_by("name")

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhum grupo encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class GroupRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Group.objects.all()
    serializer_class = GroupSerializer

    def get_serializer_class(self):
        return GroupSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        if serializer.data == {}:
            return Response(
                {"success": False, "result": "Grupo não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"success": True, "result": "Grupo deletado com sucesso."},
            status=status.HTTP_204_NO_CONTENT,
        )


class EscalaTrabalhoListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = EscalaTrabalhoSimpleSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = EscalaTrabalhoFilter
    queryset = EscalaTrabalho.objects.all()

    def get_serializer_class(self, *args, **kwargs):
        if self.request.method == "GET":
            return EscalaTrabalhoListDetailSerializer
        return EscalaTrabalhoSimpleSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        serializer = self.get_serializer(queryset, many=True)

        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhuma Pessoa Referência encontrada."},
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if not serializer.is_valid():
            print("ERRO ESCALA CREATE:", serializer.errors, "payload:", request.data)
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
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )



class EscalaTrabalhoRetrieveUpdateDeleteView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = EscalaTrabalhoSimpleSerializer
    queryset = EscalaTrabalho.objects.all()

    def get_serializer_class(self):
        if self.request.method == "GET":
            return EscalaTrabalhoListDetailSerializer
        return EscalaTrabalhoSimpleSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        if serializer.data == {}:
            return Response(
                {"success": False, "result": "Escala de Trabalho não encontrada."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        if not serializer.is_valid():
            print(
                "ERRO ESCALA UPDATE:",
                serializer.errors,
                "payload:",
                request.data,
                "url_id:",
                str(instance.pk),
            )
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
        self.perform_update(serializer)
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_200_OK,
        )


    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(
            {"success": True, "result": "Escala de Trabalho deletada com sucesso."},
            status=status.HTTP_204_NO_CONTENT,
        )
