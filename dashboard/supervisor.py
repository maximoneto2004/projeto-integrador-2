"""Escopo e consulta dos indicadores operacionais do supervisor."""

from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, permissions, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import LimitOffsetPagination

from agendamentos.models import Agendamento
from app.permissions import DjangoModelPermissionsWithView
from .sla import combinar_horario, medir_atendimento


class SupervisorPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and (
            user.is_superuser or user.groups.filter(
                Q(name__iexact="Supervisor") | Q(name__iexact="Coordenador") | Q(name__iexact="administrador")
            ).exists()
        ))


class SupervisorPeriodoSerializer(serializers.Serializer):
    unidade_id = serializers.UUIDField()
    data_inicio = serializers.DateField(default=timezone.localdate)
    data_fim = serializers.DateField(default=timezone.localdate)

    def validate(self, attrs):
        if attrs["data_inicio"] > attrs["data_fim"]:
            raise serializers.ValidationError("A data inicial deve ser anterior ou igual à data final.")
        return attrs


class SupervisorScopeMixin:
    permission_classes = [permissions.IsAuthenticated, SupervisorPermission, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()

    def get_queryset(self):
        params = SupervisorPeriodoSerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        self.periodo = params.validated_data
        user = self.request.user
        administrador = user.is_superuser or user.groups.filter(name__iexact="administrador").exists()
        if not administrador and not user.unidades_lotacao.filter(pk=self.periodo["unidade_id"]).exists():
            raise PermissionDenied("Você não tem acesso aos indicadores desta unidade.")
        return super().get_queryset().filter(
            unidade_id=self.periodo["unidade_id"],
            data__range=(self.periodo["data_inicio"], self.periodo["data_fim"]),
        )


class AtendimentoSlaSerializer(serializers.ModelSerializer):
    identificador = serializers.SerializerMethodField()
    cidadao_nome = serializers.CharField(source="cidadao.nome")
    profissional_nome = serializers.CharField(source="atendente.nome_completo", default=None)
    profissional_id = serializers.UUIDField(source="atendente_id", allow_null=True)
    servico_nome = serializers.CharField(source="servico.nome")
    unidade_nome = serializers.CharField(source="unidade.nome")
    situacao_nome = serializers.CharField(source="get_situacao_display")
    meta_min = serializers.IntegerField(source="servico.tipo_servico.tempo_atendimento")
    medicao = serializers.SerializerMethodField()

    class Meta:
        model = Agendamento
        fields = ["id", "identificador", "cidadao_nome", "profissional_nome", "profissional_id", "servico_id",
                  "servico_nome", "unidade_nome", "situacao", "situacao_nome", "origem", "data", "horario",
                  "created_at", "meta_min", "medicao"]

    def get_identificador(self, obj):
        # O sistema não tem senha numérica; mostramos uma referência ao ID real.
        return str(obj.pk).split("-")[0].upper()

    def get_medicao(self, obj):
        inicio, fim, duracao, historico, motivo = medir_atendimento(obj)
        meta = obj.servico.tipo_servico.tempo_atendimento
        return {
            "inicio": inicio.isoformat() if inicio else None,
            "fim": fim.isoformat() if fim else None,
            "duracao_min": duracao,
            "historico": historico,
            "motivo": motivo,
            "dentro_meta": (duracao <= meta) if duracao is not None and meta else None,
            "agendado_em": combinar_horario(obj.data, obj.horario).isoformat(),
        }


class SupervisorAtendimentosParamsSerializer(serializers.Serializer):
    profissional_id = serializers.UUIDField(required=False)
    servico_id = serializers.UUIDField(required=False)
    busca = serializers.CharField(required=False, max_length=150, allow_blank=True)


class SupervisorPagination(LimitOffsetPagination):
    default_limit = 10
    max_limit = 100


class SupervisorAtendimentosAPIView(SupervisorScopeMixin, generics.ListAPIView):
    serializer_class = AtendimentoSlaSerializer
    pagination_class = SupervisorPagination

    def get_queryset(self):
        qs = super().get_queryset()
        params = SupervisorAtendimentosParamsSerializer(data=self.request.query_params)
        params.is_valid(raise_exception=True)
        valores = params.validated_data
        if valores.get("profissional_id"):
            qs = qs.filter(atendente_id=valores["profissional_id"])
        if valores.get("servico_id"):
            qs = qs.filter(servico_id=valores["servico_id"])
        if valores.get("busca"):
            busca = valores["busca"]
            qs = qs.filter(Q(cidadao__nome__icontains=busca) | Q(id__icontains=busca)
                           | Q(atendente__nome_completo__icontains=busca) | Q(servico__nome__icontains=busca))
        return qs.select_related("cidadao", "atendente", "servico__tipo_servico", "unidade").order_by("-data", "-horario", "id")
