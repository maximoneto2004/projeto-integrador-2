from .serializers import (
    BloqueioHorarioSerializer,
    EMPTY_METRICAS,
    ServicoUnidadePostoSerializer,
    UnidadePostoSerializer,
    UnidadePostoSerializerDetail,
    UnidadePostoMapaSerializer,
)
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination
from .models import BloqueioHorario, ServicoUnidadePosto, UnidadePosto
from app.permissions import DjangoModelPermissionsWithView
from app.static_data import DIA_SEMANA_CHOICES, SITUACAO_AGENDAMENTO_CHOICES
from .filters import (
    UnidadePostoFilter,
    UnidadePostoMapaFilter,
    ServicoUnidadePostoDiaFilter,
    ServicoUnidadePostoUnidadeFilter,
    BloqueioHorarioUnidadeFilter,
)
from agendamentos.services import cancelar_agendamento
from datetime import datetime
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.utils.dateparse import parse_date
from agendamentos.models import Agendamento, AgendaVaga
from django.db.models import Count, F, Prefetch, Q
from agendamentos.models import Agendamento
from usuarios.models import Usuario
from usuarios.serializers import UsuarioSerializer
from dashboard.indicadores import metricas_mapa_por_unidade, metricas_por_servico
from dashboard.mapa_assistencial import PeriodoMapaSerializer, analise_por_unidade
from dashboard.permissoes import pode_ver_gestao


def _resolve_supervisor_period(request):
    data_inicio_raw = request.query_params.get("data_inicio")
    data_fim_raw = request.query_params.get("data_fim")

    params = PeriodoMapaSerializer(data=request.query_params)
    params.is_valid(raise_exception=True)
    return (data_inicio_raw, data_fim_raw, params.validated_data["data_inicio"].isoformat(),
            params.validated_data["data_fim"].isoformat())


def _build_empty_metricas():
    return {
        **EMPTY_METRICAS,
        "profissionais": [],
        "servicos_metricas": [],
        "origem_atendimentos": dict(EMPTY_METRICAS["origem_atendimentos"]),
    }


def _load_metricas_complementares(unidade_ids, data_inicio, data_fim, include_profissionais_detalhe=True):
    unidade_ids = [str(uid) for uid in unidade_ids if uid]
    if not unidade_ids:
        return {}, {}

    data_inicio_date = parse_date(str(data_inicio)) if data_inicio else None
    data_fim_date = parse_date(str(data_fim)) if data_fim else None
    if not data_inicio_date or not data_fim_date:
        return {}, {}

    profissionais_rows = (
        Usuario.objects.filter(is_active=True, unidades_lotacao__in=unidade_ids)
        .values("unidades_lotacao")
        .annotate(total=Count("id", distinct=True))
    )
    profissionais_por_unidade = {
        str(row["unidades_lotacao"]): int(row["total"] or 0)
        for row in profissionais_rows
    }

    if not include_profissionais_detalhe:
        return (
            profissionais_por_unidade,
            {unidade_id: [] for unidade_id in unidade_ids},
        )

    profissionais_base_rows = (
        Usuario.objects.filter(is_active=True, unidades_lotacao__in=unidade_ids)
        .values("unidades_lotacao", "id", "nome_completo")
        .distinct()
        .order_by("nome_completo")
    )
    profissional_ids = sorted({row["id"] for row in profissionais_base_rows if row.get("id")})
    profissionais_obj_por_id = {}
    if profissional_ids:
        profissionais_qs = (
            Usuario.objects.filter(id__in=profissional_ids)
            .select_related("guiche_atual")
            .prefetch_related("groups", "unidades_lotacao", "escalas", "tipo_ofertados")
        )
        profissionais_obj_por_id = {
            str(item["id"]): item
            for item in UsuarioSerializer(profissionais_qs, many=True).data
        }

    profissionais_detalhe_por_unidade = {}
    for row in profissionais_base_rows:
        unidade_id = str(row["unidades_lotacao"])
        profissional_id = str(row["id"])
        profissionais_detalhe_por_unidade.setdefault(unidade_id, []).append(
            {
                "id": profissional_id,
                "nome": row["nome_completo"],
                "profissional": profissionais_obj_por_id.get(profissional_id),
            }
        )

    for unidade_id in unidade_ids:
        profissionais_detalhe_por_unidade.setdefault(unidade_id, [])

    return profissionais_por_unidade, profissionais_detalhe_por_unidade


class UnidadePostoCreateListView(generics.ListCreateAPIView):
    queryset = UnidadePosto.objects.all()
    serializer_class = UnidadePostoSerializer
    pagination_class = LimitOffsetPagination
    filter_backends=[DjangoFilterBackend]
    filterset_class=UnidadePostoFilter


    def get_queryset(self):
        return (
            UnidadePosto.objects.select_related('bairro')
            .prefetch_related(
                "bairros_abrangencia",
                Prefetch(
                    "servicos_unidade",
                    queryset=ServicoUnidadePosto.objects.select_related("servico"),
                ),
            )
            .only(
                "id",
                "created_at",
                "updated_at",
                "is_active",
                "nome",
                "logradouro",
                "numero",
                "complemento",
                "cep",
                "bairro_id",
                "telefone",
                "email",
                "hora_manha_inicio",
                "hora_manha_fim",
                "hora_tarde_inicio",
                "hora_tarde_fim",
                "latitude",
                "longitude",
            )
        )

    def get_permissions(self):
        if self.request.method == "GET":
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated(), DjangoModelPermissionsWithView()]

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        queryset = queryset.exclude(nome='Célula de Proteção Básica - CEPB').order_by("nome")
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)

            if not serializer.data:
                return self.get_paginated_response({
                    "success": False,
                    "result": "Nenhuma unidade encontrada",
                })

            return self.get_paginated_response({
                "success": True,
                "result": serializer.data,
            })

        serializer = self.get_serializer(queryset, many=True)
        if not serializer.data:
            return Response(
                {"success": False, "result": "Nenhuma unidade encontrada"},
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


class UnidadePostoMapaListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = UnidadePostoMapaSerializer
    queryset = (
        UnidadePosto.objects.filter(is_active=True)
        .select_related("bairro")
        .order_by("nome")
    )
    filter_backends = [DjangoFilterBackend]
    filterset_class = UnidadePostoMapaFilter

    def _get_unidades_filtradas(self):
        if not hasattr(self, "_unidades_filtradas"):
            self._unidades_filtradas = list(self.filter_queryset(self.get_queryset()))
        return self._unidades_filtradas

    def get_serializer_context(self):
        context = super().get_serializer_context()
        _, _, data_inicio, data_fim = _resolve_supervisor_period(self.request)

        unidades = self._get_unidades_filtradas()
        unidade_ids = [str(unidade.id) for unidade in unidades]
        (
            profissionais_por_unidade,
            _,
        ) = _load_metricas_complementares(
            unidade_ids=unidade_ids,
            data_inicio=data_inicio,
            data_fim=data_fim,
            include_profissionais_detalhe=False,
        )
        metricas_mapa = metricas_mapa_por_unidade(unidade_ids, data_inicio, data_fim)
        metricas_por_unidade = {
            unidade_id_str: {
                **_build_empty_metricas(),
                **metricas_mapa.get(unidade_id_str, {}),
                "profissionais_total": int(profissionais_por_unidade.get(unidade_id_str, 0) or 0),
            }
            for unidade_id_str in unidade_ids
        }
        context["metricas_por_unidade"] = metricas_por_unidade
        if pode_ver_gestao(self.request.user):
            context["analise_por_unidade"] = analise_por_unidade(unidade_ids, data_inicio, data_fim)
        return context

    def list(self, request, *args, **kwargs):
        queryset = self._get_unidades_filtradas()
        serializer = self.get_serializer(queryset, many=True)

        if not serializer.data:
            return Response(
                {"success": False, "result": "Nenhuma unidade encontrada para o mapa."},
                status=status.HTTP_200_OK,
            )

        return Response(
            {"success": True, "result": serializer.data},
            status=status.HTTP_200_OK,
        )


class UnidadePostoMapaRetrieveView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = UnidadePostoMapaSerializer
    queryset = UnidadePosto.objects.filter(is_active=True)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        _, _, data_inicio, data_fim = _resolve_supervisor_period(self.request)
        unidade_id = self.kwargs.get("pk")
        unidade_id_str = str(unidade_id)

        (
            profissionais_por_unidade,
            profissionais_detalhe_por_unidade,
        ) = _load_metricas_complementares(
            unidade_ids=[unidade_id_str],
            data_inicio=data_inicio,
            data_fim=data_fim,
        )

        # Mesmas regras do mapa e dos dashboards; os serviços detalham o resumo da unidade.
        periodo = Agendamento.objects.filter(unidade_id=unidade_id_str, data__range=(data_inicio, data_fim))
        context["metricas_por_unidade"] = {
            unidade_id_str: {
                **_build_empty_metricas(),
                **metricas_mapa_por_unidade([unidade_id_str], data_inicio, data_fim)[unidade_id_str],
                "profissionais_total": int(profissionais_por_unidade.get(unidade_id_str, 0) or 0),
                "profissionais": profissionais_detalhe_por_unidade.get(unidade_id_str, []),
                "servicos_metricas": metricas_por_servico(periodo),
            },
        }
        if pode_ver_gestao(self.request.user):
            context["analise_por_unidade"] = analise_por_unidade([unidade_id_str], data_inicio, data_fim)
        return context

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        result = dict(serializer.data)
        return Response(
            {"success": True, "result": result},
            status=status.HTTP_200_OK,
        )


class UnidadePostoRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = UnidadePosto.objects.all()
    serializer_class = UnidadePostoSerializer


class ServicoUnidadePostoCreateListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ServicoUnidadePosto.objects.all()
    serializer_class = ServicoUnidadePostoSerializer
    pagination_class = LimitOffsetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = ServicoUnidadePostoUnidadeFilter

    def get_queryset(self):
        return ServicoUnidadePosto.objects.all()

    def list(self, request, *args, **kwargs):
        data_param = request.query_params.get("data", None)
        unidade_param = request.query_params.get("unidade", None)
        nome_param = request.query_params.get("nome", None)
        queryset = self.get_queryset()

        if data_param:
            try:
                data_object = datetime.strptime(data_param, "%d/%m/%Y")
                dia_num = data_object.isoweekday()
                if dia_num >= 7:
                    dia_num = 0
                dia_da_semana = DIA_SEMANA_CHOICES[dia_num][0]
                queryset = queryset.filter(dias_semana__contains=[dia_da_semana])
            except ValueError:
                return Response(
                    {
                        "success": False,
                        "result": "Formato de data inválido. Use DD/MM/YYYY.",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        if nome_param:
            termo = nome_param.strip()
            if termo:
                queryset = queryset.filter(
                    Q(servico__nome__icontains=termo)
                    | Q(servico__tipo_servico__nome__icontains=termo)
                )

        if unidade_param:
            try:
                queryset = queryset.filter(unidade__id=unidade_param)
            except ValueError:
                return Response(
                    {"success": False, "result": "ID de unidade inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        queryset = self.filter_queryset(queryset)
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            if not serializer.data:
                return self.get_paginated_response(
                    {"success": False, "result": "Nenhum serviço encontrado."}
                )
            return self.get_paginated_response(
                {"success": True, "data": serializer.data}
            )

        serializer = self.get_serializer(queryset, many=True)
        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhum serviço encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except ValidationError as exc:
            if isinstance(exc.detail, (list, tuple)):
                message = exc.detail[0] if exc.detail else "Erro de validação."
            elif isinstance(exc.detail, dict):
                first_value = next(iter(exc.detail.values()), "Erro de validação.")
                message = first_value[0] if isinstance(first_value, (list, tuple)) else first_value
            else:
                message = exc.detail
            return Response(
                {"success": False, "result": str(message)},
                status=status.HTTP_409_CONFLICT,
            )
        self.perform_create(serializer)
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class ServicoUnidadePostoRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ServicoUnidadePosto.objects.all()
    serializer_class = ServicoUnidadePostoSerializer

    def get_serializer_class(self):
        return ServicoUnidadePostoSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        if serializer.data == {}:
            return Response(
                {"success": False, "result": "Serviço não encontrado."},
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
            {"success": True, "result": "Serviço deletado com sucesso."},
            status=status.HTTP_204_NO_CONTENT,
        )


class BloqueioHorarioCreateListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = BloqueioHorario.objects.all()
    serializer_class = BloqueioHorarioSerializer
    pagination_class = LimitOffsetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = BloqueioHorarioUnidadeFilter

    def perform_create(self, serializer):
        bloqueio = serializer.save()
        data_final = bloqueio.data_final or bloqueio.data

        #CANCELA AGENDAMENTOS
        agendamentos_cancelar = Agendamento.objects.filter(
            unidade__in=bloqueio.unidades.all(),
            data__range=[bloqueio.data, data_final],
            horario__gte=bloqueio.hora_inicio,
            horario__lt=bloqueio.hora_fim,
            situacao__in=["ATIVADO", "AGENDADO"],
        )

        for agendamento in agendamentos_cancelar:
            try:
                cancelar_agendamento(
                    agendamento_id=agendamento.id,
                    origem="CANCELADO_CRAS",
                    liberar_vaga=False
                )
            except Exception as error:
                raise Exception(f"Erro ao cancelar agendamento por bloqueio de horário: {error}")
            
        #BLOQUEIA VAGAS LIVRES
        vagas_periodo = AgendaVaga.objects.filter(
            unidade__in=bloqueio.unidades.all(),
            data__range=[bloqueio.data, data_final],
            horario__gte=bloqueio.hora_inicio,
            horario__lt=bloqueio.hora_fim,
        )
        for vaga in vagas_periodo:
            vaga.vagas_ocupadas = vaga.vagas
            vaga.save(update_fields=['vagas_ocupadas', 'updated_at'])


    def get_serializer_class(self):
        return BloqueioHorarioSerializer

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset()).order_by("-created_at")
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            if serializer.data == []:
                return self.get_paginated_response(
                    {
                        "success": False,
                        "data": [],
                        "result": "Nenhum bloqueio de horário encontrado.",
                    }
                )
            return self.get_paginated_response(
                {"success": True, "data": serializer.data}
            )

        serializer = self.get_serializer(queryset, many=True)
        if serializer.data == []:
            return Response(
                {"success": False, "result": "Nenhum bloqueio de horário encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": serializer.data})

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            self.perform_create(serializer)
        except Exception as error:
            return Response({
                "success": False,
                "result": error
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_201_CREATED,
        )


class BloqueioHorarioRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):

    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = BloqueioHorario.objects.all()
    serializer_class = BloqueioHorarioSerializer

    def get_serializer_class(self):
        return BloqueioHorarioSerializer

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)

        if serializer.data == {}:
            return Response(
                {"success": False, "result": "Bloqueio de horário não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

        return Response({"success": True, "data": serializer.data})

    def update(self, request, *args, **kwargs):

        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        bloqueio_antigo = {
            "data_inicio": instance.data,
            "data_final": instance.data_final or instance.data,
            "hora_inicio": instance.hora_inicio,
            "hora_fim": instance.hora_fim,
            "unidades": list(instance.unidades.values_list("id", flat=True)),
            "is_active": getattr(instance, "is_active", True),
        }

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)

        instance.refresh_from_db()

        bloqueio_novo = {
            "data_inicio": instance.data,
            "data_final": instance.data_final or instance.data,
            "hora_inicio": instance.hora_inicio,
            "hora_fim": instance.hora_fim,
            "unidades": list(instance.unidades.values_list("id", flat=True)),
            "is_active": getattr(instance, "is_active", True),
        }

        if bloqueio_antigo != bloqueio_novo:
            AgendaVaga.objects.filter(
                unidade__in=instance.unidades.all(),
                data__range=[bloqueio_antigo["data_inicio"], bloqueio_antigo["data_final"]],
                horario__gte=bloqueio_antigo["hora_inicio"],
                horario__lt=bloqueio_antigo["hora_fim"]
            ).update(vagas_ocupadas=0, updated_at=timezone.now())

            if bloqueio_novo["is_active"]:
                agendamentos_cancelar = Agendamento.objects.filter(
                    unidade__in=instance.unidades.all(),
                    data__range=[bloqueio_novo["data_inicio"], bloqueio_novo["data_final"]],
                    horario__gte=bloqueio_novo["hora_inicio"],
                    horario__lt=bloqueio_novo["hora_fim"],
                    situacao__in=["ATIVADO", "AGENDADO"],
                )
                for agendamento in agendamentos_cancelar:
                    cancelar_agendamento(
                        agendamento_id=agendamento.id,
                        origem="CANCELADO_CRAS",
                        liberar_vaga=False
                    )
                    
                AgendaVaga.objects.filter(
                    unidade__in=instance.unidades.all(),
                    data__range=[bloqueio_novo["data_inicio"], bloqueio_novo["data_final"]],
                    horario__gte=bloqueio_novo["hora_inicio"],
                    horario__lt=bloqueio_novo["hora_fim"]
                ).update(vagas_ocupadas=F('vagas'), updated_at=timezone.now())

        
        return Response(
            {"success": True, "data": serializer.data},
            status=status.HTTP_200_OK,
        )

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        data_inicio = instance.data
        data_final = instance.data_final or instance.data
        hora_inicio = instance.hora_inicio
        hora_fim = instance.hora_fim
        unidades = list(instance.unidades.values_list("id", flat=True))

        self.perform_destroy(instance)

        AgendaVaga.objects.filter(
            unidade__in=unidades,
            data__range=[data_inicio, data_final],
            horario__gte=hora_inicio,
            horario__lt=hora_fim
        ).update(vagas_ocupadas=0, updated_at=timezone.now())

        return Response(
            {"success": True, "result": "Bloqueio de horário deletado com sucesso."},
            status=status.HTTP_204_NO_CONTENT,
        )
