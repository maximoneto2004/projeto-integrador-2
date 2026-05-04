from django.shortcuts import render
from django.utils import timezone
from django.http import Http404
from django.core.cache import cache
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import generics, status, permissions
from rest_framework.pagination import LimitOffsetPagination
from django.db.models import Case, IntegerField, Value, When
from rest_framework.response import Response
from rest_framework.views import APIView

from fila_espera.filters import FilaEsperaFilter
from fila_espera.models import FilaEspera
from fila_espera.serializers import FilaEsperaDetailSerializer, FilaEsperaSerializer
from agendamentos.models import Agendamento
from agendamentos.serializers import AgendamentoDetailSerializer
from usuarios.models import EscalaTrabalho
from app.permissions import DjangoModelPermissionsWithView


def _get_fila_queryset_for_user(user):
    if not user or not user.is_authenticated:
        return FilaEspera.objects.none()

    dia_semana_atual = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"][
        timezone.localdate().weekday()
    ]
    escalas = EscalaTrabalho.objects.select_related("unidade").filter(
        profissional=user, is_active=True
    )
    escala_ativa = next(
        (esc for esc in escalas if dia_semana_atual in esc.dias_semana), None
    )

    if escala_ativa is None:
        return FilaEspera.objects.none()

    queryset = FilaEspera.objects.filter(unidade=escala_ativa.unidade)

    if user.groups.filter(name="Atendente").exists():
        tipos_ofertados = user.tipo_ofertados.all()
        if not tipos_ofertados.exists():
            return FilaEspera.objects.none()
        queryset = queryset.filter(servico__tipo_servico__in=tipos_ofertados)

    return (
        queryset.annotate(
            urgencia_ordem=Case(
                When(urgencia="ALTA", then=Value(0)),
                When(urgencia="NORMAL", then=Value(1)),
                default=Value(2),
                output_field=IntegerField(),
            ),
            prioridade_ordem=Case(
                When(prioridade="PREFERENCIAL+", then=Value(0)),
                When(prioridade="PREFERENCIAL", then=Value(1)),
                When(prioridade="NORMAL", then=Value(2)),
                default=Value(3),
                output_field=IntegerField(),
            ),
        )
        .order_by("urgencia_ordem", "prioridade_ordem", "created_at")
    )


def _get_unidade_id_for_user(user):
    if not user or not user.is_authenticated:
        return None

    dia_semana_atual = ["SEG", "TER", "QUA", "QUI", "SEX", "SAB", "DOM"][
        timezone.localdate().weekday()
    ]
    escalas = EscalaTrabalho.objects.select_related("unidade").filter(
        profissional=user, is_active=True
    )
    escala_ativa = next(
        (esc for esc in escalas if dia_semana_atual in esc.dias_semana), None
    )

    return escala_ativa.unidade_id if escala_ativa else None


class FilaEsperaListCreateView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = FilaEsperaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = FilaEsperaFilter
    pagination_class = LimitOffsetPagination

    def get_serializer_class(self):
        if self.request.method == "GET":
            return FilaEsperaDetailSerializer
        return FilaEsperaSerializer

    def get_queryset(self):
        return _get_fila_queryset_for_user(self.request.user)

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            if not serializer.data:
                return self.get_paginated_response(
                    {"success": False, "result": "Nenhuma fila de espera encontrada."}
                )
            return self.get_paginated_response(
                {"success": True, "result": serializer.data}
            )

        serializer = self.get_serializer(queryset, many=True)
        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhuma fila de espera encontrada."},
            )

        return Response({"success": True, "result": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class FilaEsperaRetrieveUpdatedDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = FilaEsperaSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_class = FilaEsperaFilter

    def get_serializer_class(self):
        if self.request.method == "GET":
            return FilaEsperaDetailSerializer
        return FilaEsperaSerializer

    def get_queryset(self):
        return _get_fila_queryset_for_user(self.request.user)

    def handle_exception(self, exc):
        if isinstance(exc, Http404):
            return Response(
                {"success": False, "result": "Fila de espera não encontrada."},
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
                "mensagem": "Fila de espera excluída com sucesso.",
            },
            status=status.HTTP_200_OK,
        )


class FilaEsperaChamarProximoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = FilaEspera.objects.all()

    def get_queryset(self):
        print("Teste fila")
        return _get_fila_queryset_for_user(self.request.user)

    def post(self, request, *args, **kwargs):
        unidade_id = _get_unidade_id_for_user(request.user)
        if unidade_id:
            lock_key = f"fila_espera_chamar_proximo_lock:{unidade_id}"
            if not cache.add(lock_key, True, timeout=10):
                return Response(
                    {
                        "success": False,
                        "result": "Aguarde alguns segundos para chamar o próximo.",
                    },
                    status=status.HTTP_429_TOO_MANY_REQUESTS,
                )
        else:
            lock_key = None

        itens = list(self.get_queryset())
        if not itens:
            return Response(
                {"success": False, "result": "Nenhuma pessoa na fila para chamar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        proximo = itens[0]
        agora = timezone.localtime()

        atendente = None
        user = request.user
        if user and user.is_authenticated:
            if hasattr(user, "groups") and user.groups.filter(name__in=["Atendente", "Supervisor"]).exists():
                atendente = user
            hoje = timezone.localdate()
            agendamentos_usuario = Agendamento.objects.filter(
                atendente=user,
                data=hoje,
                situacao__in=["CHAMANDO", "ATENDIMENTO"],
            ).values("id", "situacao", "data", "horario")
            print("AGENDAMENTOS DO USUARIO:", list(agendamentos_usuario))
            if agendamentos_usuario.exists():
                return Response(
                    {
                        "success": False,
                        "result": "Atendente já possui agendamento em aberto.",
                    },
                    status=status.HTTP_409_CONFLICT,
                )

        agendamento = Agendamento.objects.create(
            cidadao=proximo.cidadao,
            servico=proximo.servico,
            unidade=proximo.unidade,
            vaga=None,
            data=agora.date(),
            horario=agora.time(),
            situacao="CHAMANDO",
            origem="FILA",
            atendente=atendente,
        )

        proximo.delete()

        return Response(
            {"success": True, "result": AgendamentoDetailSerializer(agendamento).data},
            status=status.HTTP_201_CREATED,
        )
