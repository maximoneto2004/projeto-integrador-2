from .serializers import (
    BloqueioHorarioSerializer,
    EMPTY_METRICAS,
    ServicoUnidadeCrasSerializer,
    UnidadeCrasSerializer,
    UnidadeCrasSerializerDetail,
    UnidadeCrasMapaSerializer,
)
from collections import defaultdict
from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import LimitOffsetPagination
from .models import BloqueioHorario, ServicoUnidadeCras, UnidadeCras
from app.permissions import DjangoModelPermissionsWithView
from app.static_data import DIA_SEMANA_CHOICES, SITUACAO_AGENDAMENTO_CHOICES
from .filters import (
    UnidadeCrasFilter,
    UnidadeCrasMapaFilter,
    ServicoUnidadeCrasDiaFilter,
    ServicoUnidadeCrasUnidadeFilter,
    BloqueioHorarioUnidadeFilter,
)
from agendamentos.services import cancelar_agendamento
from datetime import datetime
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone
from django.utils.dateparse import parse_date
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F
from agendamentos.models import Agendamento, AgendaVaga
from django.db.models import Avg, Count, DurationField, ExpressionWrapper, F, Prefetch, Q
from agendamentos.models import Agendamento
from avaliacao.models import Avaliacao
from usuarios.models import Usuario
from usuarios.serializers import UsuarioSerializer
from servicos.models import Servico
from dashboard.filters import DashboardSupervisorFilter
from dashboard.metrics import (
    calculate_pct_acima_esperado,
    calculate_tempo_excedente_medio_min,
)
from dashboard.serializers import DashboardSupervisorSerializer


def _normalize_text(value):
    text = str(value or "").strip().lower()
    return (
        text.replace("á", "a")
        .replace("à", "a")
        .replace("â", "a")
        .replace("ã", "a")
        .replace("é", "e")
        .replace("ê", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ô", "o")
        .replace("õ", "o")
        .replace("ú", "u")
        .replace("ç", "c")
    )


def _resolve_supervisor_period(request):
    data_inicio_raw = request.query_params.get("data_inicio")
    data_fim_raw = request.query_params.get("data_fim")

    if not data_inicio_raw and not data_fim_raw:
        today = timezone.localdate().isoformat()
        return data_inicio_raw, data_fim_raw, today, today

    return data_inicio_raw, data_fim_raw, data_inicio_raw, data_fim_raw


def _load_supervisor_data_for_unidade(unidade_id, data_inicio_raw, data_fim_raw, data_inicio, data_fim):
    filtro_data = {"unidade_id": str(unidade_id)}
    if data_inicio_raw:
        filtro_data["data_inicio"] = data_inicio_raw
    if data_fim_raw:
        filtro_data["data_fim"] = data_fim_raw

    filterset = DashboardSupervisorFilter(data=filtro_data, queryset=Agendamento.objects.all())
    serializer = DashboardSupervisorSerializer(
        data={
            "data_inicio": data_inicio,
            "data_fim": data_fim,
            "unidade_id": str(unidade_id),
        },
        context={"queryset": filterset.qs},
    )
    serializer.is_valid(raise_exception=True)
    return serializer.data


def _build_empty_metricas():
    return {
        **EMPTY_METRICAS,
        "profissionais": [],
        "servicos_metricas": [],
        "origem_atendimentos": dict(EMPTY_METRICAS["origem_atendimentos"]),
    }


def _minutes(value):
    if not value:
        return None
    return value.hour * 60 + value.minute + (value.second / 60)


def _diff_minutes(end, start):
    if not end or not start:
        return None
    return _minutes(end) - _minutes(start)


def _load_metricas_complementares(unidade_ids, data_inicio, data_fim, include_profissionais_avaliacao=True):
    unidade_ids = [str(uid) for uid in unidade_ids if uid]
    if not unidade_ids:
        return {}, {}, {}

    data_inicio_date = parse_date(str(data_inicio)) if data_inicio else None
    data_fim_date = parse_date(str(data_fim)) if data_fim else None
    if not data_inicio_date or not data_fim_date:
        return {}, {}, {}

    profissionais_rows = (
        Usuario.objects.filter(is_active=True, unidades_lotacao__in=unidade_ids)
        .values("unidades_lotacao")
        .annotate(total=Count("id", distinct=True))
    )
    profissionais_por_unidade = {
        str(row["unidades_lotacao"]): int(row["total"] or 0)
        for row in profissionais_rows
    }

    avaliacao_rows = (
        Avaliacao.objects.filter(
            agendamento__unidade_id__in=unidade_ids,
            agendamento__data__range=(data_inicio_date, data_fim_date),
        )
        .values("agendamento__unidade_id")
        .annotate(media=Avg("nota"), total=Count("id"))
    )
    avaliacao_por_unidade = {
        str(row["agendamento__unidade_id"]): {
            "media": float(row["media"] or 0),
            "total": int(row["total"] or 0),
        }
        for row in avaliacao_rows
    }

    if not include_profissionais_avaliacao:
        return (
            profissionais_por_unidade,
            avaliacao_por_unidade,
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

    avaliacao_profissional_rows = (
        Avaliacao.objects.filter(
            agendamento__unidade_id__in=unidade_ids,
            agendamento__data__range=(data_inicio_date, data_fim_date),
            agendamento__atendente_id__isnull=False,
        )
        .values("agendamento__unidade_id", "agendamento__atendente_id")
        .annotate(media=Avg("nota"), total=Count("id"))
    )

    avaliacao_profissional_lookup = {
        (str(row["agendamento__unidade_id"]), str(row["agendamento__atendente_id"])): {
            "media": float(row["media"] or 0),
            "total": int(row["total"] or 0),
        }
        for row in avaliacao_profissional_rows
    }

    profissionais_avaliacao_por_unidade = {}
    for row in profissionais_base_rows:
        unidade_id = str(row["unidades_lotacao"])
        profissional_id = str(row["id"])
        avaliacao_info = avaliacao_profissional_lookup.get(
            (unidade_id, profissional_id),
            {"media": 0, "total": 0},
        )
        profissionais_avaliacao_por_unidade.setdefault(unidade_id, []).append(
            {
                "id": profissional_id,
                "nome": row["nome_completo"],
                "profissional": profissionais_obj_por_id.get(profissional_id),
                "nota_media": round(float(avaliacao_info["media"] or 0), 1),
                "total_avaliacoes": int(avaliacao_info["total"] or 0),
            }
        )

    for unidade_id in unidade_ids:
        profissionais_avaliacao_por_unidade.setdefault(unidade_id, [])

    return profissionais_por_unidade, avaliacao_por_unidade, profissionais_avaliacao_por_unidade


def _load_metricas_resumidas_por_unidade(unidade_ids, data_inicio, data_fim):
    unidade_ids = [str(uid) for uid in unidade_ids if uid]
    if not unidade_ids:
        return {}, {}, {}, {}

    data_inicio_date = parse_date(str(data_inicio)) if data_inicio else None
    data_fim_date = parse_date(str(data_fim)) if data_fim else None
    if not data_inicio_date or not data_fim_date:
        return {}, {}, {}, {}

    agendamentos_periodo = Agendamento.objects.filter(
        unidade_id__in=unidade_ids,
        data__range=(data_inicio_date, data_fim_date),
    )

    totais_rows = (
        agendamentos_periodo.values("unidade_id")
        .annotate(
            total=Count("id"),
            tempo_medio=Avg(
                ExpressionWrapper(
                    F("data_hora_fim_atendimento") - F("data_hora_inicio_atendimento"),
                    output_field=DurationField(),
                )
            ),
        )
    )
    totais_por_unidade = {
        str(row["unidade_id"]): {
            "total": int(row["total"] or 0),
            "tempo_medio_atendimento_min": (
                round(row["tempo_medio"].total_seconds() / 60, 1)
                if row.get("tempo_medio")
                else 0
            ),
        }
        for row in totais_rows
    }

    origens_rows = (
        agendamentos_periodo.values("unidade_id", "origem")
        .annotate(total=Count("id"))
    )
    origens_por_unidade = defaultdict(
        lambda: {"156": 0, "RECEPCAO": 0, "SITE": 0, "FILA": 0}
    )
    for row in origens_rows:
        origem = str(row.get("origem") or "").strip()
        if origem in origens_por_unidade[str(row["unidade_id"])]:
            origens_por_unidade[str(row["unidade_id"])][origem] = int(row["total"] or 0)

    atendimentos_categoria_rows = (
        agendamentos_periodo.values(
            "unidade_id",
            "servico_id",
            "servico__tipo_servico__nome",
        )
        .annotate(total=Count("id"))
    )
    categoria_por_unidade = defaultdict(
        lambda: {
            "servicos_prestados_30d": 0,
            "servicos_distintos_30d": set(),
            "atendimentos_comum_30d": 0,
            "atendimentos_especializado_30d": 0,
        }
    )
    for row in atendimentos_categoria_rows:
        unidade_id = str(row["unidade_id"])
        total = int(row["total"] or 0)
        servico_id = str(row.get("servico_id") or "").strip()
        tipo_nome = _normalize_text(row.get("servico__tipo_servico__nome"))
        categoria_por_unidade[unidade_id]["servicos_prestados_30d"] += total
        if servico_id:
            categoria_por_unidade[unidade_id]["servicos_distintos_30d"].add(servico_id)
        if "especial" in tipo_nome:
            categoria_por_unidade[unidade_id]["atendimentos_especializado_30d"] += total
        else:
            categoria_por_unidade[unidade_id]["atendimentos_comum_30d"] += total

    finalizados_rows = agendamentos_periodo.filter(situacao="FINALIZADO").values(
        "unidade_id",
        "servico_id",
        "servico__tipo_servico__tempo_atendimento",
        "horario",
        "data_hora_inicio_atendimento",
        "data_hora_fim_atendimento",
    )
    tempo_servico_por_unidade = defaultdict(
        lambda: defaultdict(
            lambda: {
                "total": 0,
                "cont_espera": 0,
                "cont_duracao": 0,
                "soma_duracao": 0.0,
                "soma_espera": 0.0,
                "soma_excedente": 0.0,
                "esperado": 20,
                "tipo_nome": "",
            }
        )
    )
    for row in finalizados_rows.iterator(chunk_size=10000):
        unidade_id = str(row["unidade_id"])
        servico_id = str(row.get("servico_id") or "").strip()
        if not servico_id:
            continue

        esperado = row.get("servico__tipo_servico__tempo_atendimento") or 20
        try:
            esperado = int(esperado)
        except (TypeError, ValueError):
            esperado = 20
        servico_info = tempo_servico_por_unidade[unidade_id][servico_id]
        servico_info["total"] += 1
        servico_info["esperado"] = esperado
        servico_info["tipo_nome"] = _normalize_text(
            row.get("servico__tipo_servico__nome")
        )

        espera = _diff_minutes(
            row.get("data_hora_inicio_atendimento"),
            row.get("horario"),
        )
        if espera is not None:
            servico_info["cont_espera"] += 1
            servico_info["soma_espera"] += max(espera, 0)

        duracao = _diff_minutes(
            row.get("data_hora_fim_atendimento"),
            row.get("data_hora_inicio_atendimento"),
        )
        if duracao is None or duracao < 0:
            continue
        servico_info["cont_duracao"] += 1
        servico_info["soma_duracao"] += duracao
        if duracao > esperado:
            excedente = duracao - esperado
            servico_info["soma_excedente"] += excedente

    tempo_por_unidade = {}
    for unidade_id, servicos_info in tempo_servico_por_unidade.items():
        finalizados_total = 0
        cont_espera_total = 0
        cont_duracao_total = 0
        soma_espera_total = 0.0
        soma_duracao_total = 0.0
        soma_esperado_total = 0.0
        soma_duracao_comum = 0.0
        cont_duracao_comum = 0
        soma_esperado_comum = 0.0
        soma_duracao_especial = 0.0
        cont_duracao_especial = 0
        soma_esperado_especial = 0.0

        for servico_info in servicos_info.values():
            total = int(servico_info["total"] or 0)
            if total <= 0:
                continue

            finalizados_total += total
            cont_espera = int(servico_info["cont_espera"] or 0)
            cont_duracao = int(servico_info["cont_duracao"] or 0)
            esperado = int(servico_info["esperado"] or 20)
            cont_espera_total += cont_espera
            cont_duracao_total += cont_duracao
            soma_espera_total += float(servico_info["soma_espera"] or 0)
            soma_duracao_total += float(servico_info["soma_duracao"] or 0)
            soma_esperado_total += esperado * cont_duracao
            tipo_nome = _normalize_text(servico_info.get("tipo_nome"))
            if "especial" in tipo_nome:
                soma_duracao_especial += float(servico_info["soma_duracao"] or 0)
                cont_duracao_especial += cont_duracao
                soma_esperado_especial += esperado * cont_duracao
            else:
                soma_duracao_comum += float(servico_info["soma_duracao"] or 0)
                cont_duracao_comum += cont_duracao
                soma_esperado_comum += esperado * cont_duracao

        tempo_medio_atendimento = (
            soma_duracao_total / cont_duracao_total
            if cont_duracao_total
            else 0
        )
        tempo_medio_esperado = (
            soma_esperado_total / cont_duracao_total
            if cont_duracao_total
            else 0
        )
        tempo_medio_espera = (
            soma_espera_total / cont_espera_total
            if cont_espera_total
            else 0
        )
        excedente_medio = calculate_tempo_excedente_medio_min(
            tempo_medio_atendimento,
            tempo_medio_esperado,
        )
        pct_acima = calculate_pct_acima_esperado(
            tempo_medio_atendimento,
            tempo_medio_esperado,
        )

        tempo_por_unidade[unidade_id] = {
            "finalizados_total": finalizados_total,
            "tempo_medio_atendimento_min": (
                round(tempo_medio_atendimento, 1)
                if cont_duracao_total
                else 0
            ),
            "tempo_medio_esperado_min": (
                round(tempo_medio_esperado, 1)
                if cont_duracao_total
                else 0
            ),
            "tempo_medio_atendimento_comum_min": (
                round(soma_duracao_comum / cont_duracao_comum, 1)
                if cont_duracao_comum
                else 0
            ),
            "tempo_medio_atendimento_especializado_min": (
                round(soma_duracao_especial / cont_duracao_especial, 1)
                if cont_duracao_especial
                else 0
            ),
            "tempo_medio_esperado_comum_min": (
                round(soma_esperado_comum / cont_duracao_comum, 1)
                if cont_duracao_comum
                else 0
            ),
            "tempo_medio_esperado_especializado_min": (
                round(soma_esperado_especial / cont_duracao_especial, 1)
                if cont_duracao_especial
                else 0
            ),
            "tempo_medio_espera_min": (
                round(tempo_medio_espera, 1)
                if cont_espera_total
                else 0
            ),
            "tempo_excedente_medio_min": (
                round(excedente_medio, 1)
                if cont_duracao_total
                else 0
            ),
            "pct_acima_esperado": (
                round(pct_acima, 1)
                if cont_duracao_total
                else 0
            ),
        }

    return totais_por_unidade, origens_por_unidade, categoria_por_unidade, tempo_por_unidade


def _metricas_from_dashboard_supervisor(
    dados_supervisor,
    profissionais_total=0,
    nota_avaliacao_media=0,
    nota_avaliacao_total=0,
    profissionais_avaliacao=None,
):
    origens = {"156": 0, "RECEPCAO": 0, "SITE": 0, "FILA": 0}
    for origem_row in dados_supervisor.get("origem_atendimentos", []):
        origem = str(origem_row.get("origem") or "")
        if origem in origens:
            origens[origem] = int(origem_row.get("total") or 0)

    servicos_metricas = dados_supervisor.get("servicos_metricas", [])
    atendimentos_categoria = dados_supervisor.get("atendimentos_categoria", [])

    servicos_prestados = 0
    servicos_distintos = set()
    atendimentos_comum = 0
    atendimentos_especializado = 0
    soma_espera = 0.0
    soma_tempo_atendimento = 0.0
    soma_esperado = 0.0
    soma_tempo_atendimento_comum = 0.0
    total_comum = 0
    soma_esperado_comum = 0.0
    soma_tempo_atendimento_especializado = 0.0
    total_especializado = 0
    soma_esperado_especializado = 0.0

    # Totais por serviço/tipo: usa atendimentos_categoria (todos no período).
    totais_por_servico = {}
    for item in atendimentos_categoria:
        servico_id = str(item.get("servico__id") or "").strip()
        total = int(item.get("total") or 0)
        if not servico_id or total <= 0:
            continue
        totais_por_servico[servico_id] = totais_por_servico.get(servico_id, 0) + total

    if totais_por_servico:
        servicos_distintos = set(totais_por_servico.keys())
        servicos_prestados = sum(totais_por_servico.values())
        tipo_por_servico = {
            str(row["id"]): _normalize_text(row["tipo_servico__nome"])
            for row in Servico.objects.filter(id__in=list(servicos_distintos)).values("id", "tipo_servico__nome")
        }
        for servico_id, total in totais_por_servico.items():
            tipo_nome = tipo_por_servico.get(servico_id, "")
            if "especial" in tipo_nome:
                atendimentos_especializado += total
            else:
                atendimentos_comum += total
    else:
        # Fallback para quando não vier atendimentos_categoria.
        for servico in servicos_metricas:
            total = int(servico.get("total") or 0)
            if total <= 0:
                continue
            servicos_prestados += total
            servico_id = str(servico.get("servico_id") or "").strip()
            if servico_id:
                servicos_distintos.add(servico_id)
            tipo_nome = _normalize_text(servico.get("tipo_servico_nome"))
            if "especial" in tipo_nome:
                atendimentos_especializado += total
            else:
                atendimentos_comum += total

    # Tempos médios permanecem baseados em FINALIZADO (servicos_metricas).
    finalizados_total = 0
    for servico in servicos_metricas:
        total = int(servico.get("total") or 0)
        if total <= 0:
            continue
        finalizados_total += total
        soma_espera += float(servico.get("tempo_medio_espera_min") or 0) * total
        soma_tempo_atendimento += float(
            servico.get("tempo_medio_atendimento_min") or 0
        ) * total
        soma_esperado += float(servico.get("esperado_min") or 0) * total
        tipo_nome = _normalize_text(servico.get("tipo_servico_nome"))
        if "especial" in tipo_nome:
            soma_tempo_atendimento_especializado += float(
                servico.get("tempo_medio_atendimento_min") or 0
            ) * total
            soma_esperado_especializado += float(servico.get("esperado_min") or 0) * total
            total_especializado += total
        else:
            soma_tempo_atendimento_comum += float(
                servico.get("tempo_medio_atendimento_min") or 0
            ) * total
            soma_esperado_comum += float(servico.get("esperado_min") or 0) * total
            total_comum += total

    tempo_medio_atendimento = (
        soma_tempo_atendimento / finalizados_total
        if finalizados_total
        else 0
    )
    tempo_medio_esperado = (
        soma_esperado / finalizados_total
        if finalizados_total
        else 0
    )
    tempo_medio_espera = (soma_espera / finalizados_total) if finalizados_total else 0
    tempo_excedente_medio = calculate_tempo_excedente_medio_min(
        tempo_medio_atendimento,
        tempo_medio_esperado,
    )
    pct_acima_esperado = calculate_pct_acima_esperado(
        tempo_medio_atendimento,
        tempo_medio_esperado,
    )

    return {
        "atendimentos_total": int(dados_supervisor.get("total_agendamentos") or 0),
        "profissionais_total": int(profissionais_total or 0),
        "profissionais": profissionais_avaliacao or [],
        "nota_avaliacao_media": round(float(nota_avaliacao_media or 0), 1),
        "nota_avaliacao_total": int(nota_avaliacao_total or 0),
        "tempo_medio_atendimento_min": round(tempo_medio_atendimento, 1),
        "tempo_medio_esperado_min": round(tempo_medio_esperado, 1),
        "tempo_medio_atendimento_comum_min": round(
            soma_tempo_atendimento_comum / total_comum, 1
        )
        if total_comum
        else 0,
        "tempo_medio_atendimento_especializado_min": round(
            soma_tempo_atendimento_especializado / total_especializado,
            1,
        )
        if total_especializado
        else 0,
        "tempo_medio_esperado_comum_min": round(
            soma_esperado_comum / total_comum, 1
        )
        if total_comum
        else 0,
        "tempo_medio_esperado_especializado_min": round(
            soma_esperado_especializado / total_especializado,
            1,
        )
        if total_especializado
        else 0,
        "tempo_medio_espera_min": round(tempo_medio_espera, 1),
        "servicos_prestados_30d": servicos_prestados,
        "servicos_distintos_30d": len(servicos_distintos),
        "tempo_excedente_medio_min": round(tempo_excedente_medio, 1),
        "pct_acima_esperado": round(pct_acima_esperado, 1),
        "atendimentos_comum_30d": atendimentos_comum,
        "atendimentos_especializado_30d": atendimentos_especializado,
        "servicos_metricas": servicos_metricas,
        "origem_atendimentos": origens,
    }

def _load_avaliacoes_unidade(unidade_id, data_inicio=None, data_fim=None):
    qs = Avaliacao.objects.filter(
        agendamento__unidade_id=unidade_id,
    ).select_related("agendamento", "agendamento__atendente")

    if data_inicio and data_fim:
        qs = qs.filter(agendamento__data__range=(data_inicio, data_fim))

    avaliacoes = []
    for avaliacao in qs.order_by("-created_at"):
        atendente = getattr(avaliacao.agendamento, "atendente", None)
        avaliacoes.append(
            {
                "id": str(avaliacao.id),
                "nota": int(avaliacao.nota or 0),
                "comentario": avaliacao.comentario or "",
                "created_at": avaliacao.created_at.isoformat() if avaliacao.created_at else None,
                "agendamento_id": str(avaliacao.agendamento_id) if avaliacao.agendamento_id else None,
                "data_agendamento": (
                    avaliacao.agendamento.data.isoformat()
                    if getattr(avaliacao.agendamento, "data", None)
                    else None
                ),
                "atendente": (
                    {"id": str(atendente.id), "nome": atendente.nome_completo}
                    if atendente
                    else None
                ),
            }
        )
    return avaliacoes


class UnidadeCrasCreateListView(generics.ListCreateAPIView):
    queryset = UnidadeCras.objects.all()
    serializer_class = UnidadeCrasSerializer
    pagination_class = LimitOffsetPagination
    filter_backends=[DjangoFilterBackend]
    filterset_class=UnidadeCrasFilter


    def get_queryset(self):
        return (
            UnidadeCras.objects.select_related('bairro')
            .prefetch_related(
                "bairros_abrangencia",
                Prefetch(
                    "servicos_unidade",
                    queryset=ServicoUnidadeCras.objects.select_related("servico"),
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


class UnidadeCrasMapaListView(generics.ListAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = UnidadeCrasMapaSerializer
    queryset = (
        UnidadeCras.objects.filter(is_active=True)
        .select_related("bairro")
        .order_by("nome")
    )
    filter_backends = [DjangoFilterBackend]
    filterset_class = UnidadeCrasMapaFilter

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
            avaliacao_por_unidade,
            _,
        ) = _load_metricas_complementares(
            unidade_ids=unidade_ids,
            data_inicio=data_inicio,
            data_fim=data_fim,
            include_profissionais_avaliacao=False,
        )
        (
            totais_por_unidade,
            origens_por_unidade,
            categoria_por_unidade,
            tempo_por_unidade,
        ) = _load_metricas_resumidas_por_unidade(
            unidade_ids=unidade_ids,
            data_inicio=data_inicio,
            data_fim=data_fim,
        )

        metricas_por_unidade = {}
        for unidade_id_str in unidade_ids:
            avaliacao_info = avaliacao_por_unidade.get(unidade_id_str, {"media": 0, "total": 0})
            metricas = _build_empty_metricas()
            categoria_info = categoria_por_unidade.get(unidade_id_str, {})
            tempo_info = tempo_por_unidade.get(unidade_id_str, {})
            metricas.update(
                {
                    "atendimentos_total": int(
                        totais_por_unidade.get(unidade_id_str, {}).get("total") or 0
                    ),
                    "tempo_medio_atendimento_min": float(
                        tempo_info.get("tempo_medio_atendimento_min") or 0
                    ),
                    "tempo_medio_esperado_min": float(
                        tempo_info.get("tempo_medio_esperado_min") or 0
                    ),
                    "tempo_medio_atendimento_comum_min": float(
                        tempo_info.get("tempo_medio_atendimento_comum_min") or 0
                    ),
                    "tempo_medio_atendimento_especializado_min": float(
                        tempo_info.get("tempo_medio_atendimento_especializado_min") or 0
                    ),
                    "tempo_medio_esperado_comum_min": float(
                        tempo_info.get("tempo_medio_esperado_comum_min") or 0
                    ),
                    "tempo_medio_esperado_especializado_min": float(
                        tempo_info.get("tempo_medio_esperado_especializado_min") or 0
                    ),
                    "servicos_prestados_30d": int(
                        categoria_info.get("servicos_prestados_30d") or 0
                    ),
                    "servicos_distintos_30d": len(
                        categoria_info.get("servicos_distintos_30d", set())
                    ),
                    "atendimentos_comum_30d": int(
                        categoria_info.get("atendimentos_comum_30d") or 0
                    ),
                    "atendimentos_especializado_30d": int(
                        categoria_info.get("atendimentos_especializado_30d") or 0
                    ),
                    "tempo_medio_espera_min": float(
                        tempo_info.get("tempo_medio_espera_min") or 0
                    ),
                    "tempo_excedente_medio_min": float(
                        tempo_info.get("tempo_excedente_medio_min") or 0
                    ),
                    "pct_acima_esperado": float(
                        tempo_info.get("pct_acima_esperado") or 0
                    ),
                    "origem_atendimentos": dict(
                        origens_por_unidade.get(
                            unidade_id_str,
                            EMPTY_METRICAS["origem_atendimentos"],
                        )
                    ),
                }
            )
            metricas_por_unidade[unidade_id_str] = {
                **metricas,
                "profissionais_total": int(
                    profissionais_por_unidade.get(unidade_id_str, 0) or 0
                ),
                "nota_avaliacao_media": round(
                    float(avaliacao_info.get("media", 0) or 0),
                    1,
                ),
                "nota_avaliacao_total": int(
                    avaliacao_info.get("total", 0) or 0
                ),
            }

        context["metricas_por_unidade"] = metricas_por_unidade
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


class UnidadeCrasMapaRetrieveView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    serializer_class = UnidadeCrasMapaSerializer
    queryset = UnidadeCras.objects.filter(is_active=True)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        data_inicio_raw, data_fim_raw, data_inicio, data_fim = _resolve_supervisor_period(self.request)
        unidade_id = self.kwargs.get("pk")
        unidade_id_str = str(unidade_id)

        (
            profissionais_por_unidade,
            avaliacao_por_unidade,
            profissionais_avaliacao_por_unidade,
        ) = _load_metricas_complementares(
            unidade_ids=[unidade_id_str],
            data_inicio=data_inicio,
            data_fim=data_fim,
        )

        dados_supervisor = _load_supervisor_data_for_unidade(
            unidade_id=unidade_id,
            data_inicio_raw=data_inicio_raw,
            data_fim_raw=data_fim_raw,
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
        avaliacao_info = avaliacao_por_unidade.get(unidade_id_str, {"media": 0, "total": 0})
        context["metricas_por_unidade"] = {
            unidade_id_str: _metricas_from_dashboard_supervisor(
                dados_supervisor=dados_supervisor,
                profissionais_total=profissionais_por_unidade.get(unidade_id_str, 0),
                nota_avaliacao_media=avaliacao_info.get("media", 0),
                nota_avaliacao_total=avaliacao_info.get("total", 0),
                profissionais_avaliacao=profissionais_avaliacao_por_unidade.get(unidade_id_str, []),
            ),
        }
        return context

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        _, _, data_inicio, data_fim = _resolve_supervisor_period(request)
        avaliacoes = _load_avaliacoes_unidade(
            unidade_id=instance.id,
            data_inicio=data_inicio,
            data_fim=data_fim,
        )
        result = dict(serializer.data)
        result["avaliacoes"] = avaliacoes
        return Response(
            {"success": True, "result": result},
            status=status.HTTP_200_OK,
        )


class UnidadeCrasRetrieveUpdateDestroyView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = UnidadeCras.objects.all()
    serializer_class = UnidadeCrasSerializer


class ServicoUnidadeCrasCreateListView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ServicoUnidadeCras.objects.all()
    serializer_class = ServicoUnidadeCrasSerializer
    pagination_class = LimitOffsetPagination
    filter_backends = [DjangoFilterBackend]
    filterset_class = ServicoUnidadeCrasUnidadeFilter

    def get_queryset(self):
        return ServicoUnidadeCras.objects.all()

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


class ServicoUnidadeCrasRetrieveUpdateDestroyView(
    generics.RetrieveUpdateDestroyAPIView
):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = ServicoUnidadeCras.objects.all()
    serializer_class = ServicoUnidadeCrasSerializer

    def get_serializer_class(self):
        return ServicoUnidadeCrasSerializer

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
            unidade__in=bloqueio.cras.all(),
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
            unidade__in=bloqueio.cras.all(),
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
            "cras": list(instance.cras.values_list("id", flat=True)),
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
            "cras": list(instance.cras.values_list("id", flat=True)),
            "is_active": getattr(instance, "is_active", True),
        }

        if bloqueio_antigo != bloqueio_novo:
            AgendaVaga.objects.filter(
                unidade__in=instance.cras.all(),
                data__range=[bloqueio_antigo["data_inicio"], bloqueio_antigo["data_final"]],
                horario__gte=bloqueio_antigo["hora_inicio"],
                horario__lt=bloqueio_antigo["hora_fim"]
            ).update(vagas_ocupadas=0, updated_at=timezone.now())

            if bloqueio_novo["is_active"]:
                agendamentos_cancelar = Agendamento.objects.filter(
                    unidade__in=instance.cras.all(),
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
                    unidade__in=instance.cras.all(),
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
        cras = list(instance.cras.values_list("id", flat=True))

        self.perform_destroy(instance)

        AgendaVaga.objects.filter(
            unidade__in=cras,
            data__range=[data_inicio, data_final],
            horario__gte=hora_inicio,
            horario__lt=hora_fim
        ).update(vagas_ocupadas=0, updated_at=timezone.now())

        return Response(
            {"success": True, "result": "Bloqueio de horário deletado com sucesso."},
            status=status.HTTP_204_NO_CONTENT,
        )
