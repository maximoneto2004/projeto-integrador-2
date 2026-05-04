import json
import re
import unicodedata
from collections import defaultdict
from datetime import date, timedelta
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.db.models import Avg, Count, Prefetch
from django.utils import timezone
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics

from agendamentos.models import Agendamento
from app.models import Bairro
from app.permissions import DjangoModelPermissionsWithView
from avaliacao.models import Avaliacao
from prontuario.models import Prontuario
from unidade_cras.models import UnidadeCras
from usuarios.models import Usuario

from .filters import DashboardGestorFilter, DashboardMonitorUnidadeFilter, DashboardSupervisorFilter
from .metrics import calculate_pct_acima_esperado, calculate_tempo_excedente_medio_min
from .serializers import (
    DashboardGestorSerializer,
    DashboardMonitorUnidadeSerializer,
    DashboardSupervisorSerializer,
    PerfilFamiliarSerializer,
)
class DashboardSupervisorAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()
    filterset_class = DashboardSupervisorFilter
    filter_backends = [DjangoFilterBackend]

    def get(self, request):
        qs = self.filter_queryset(self.get_queryset())

        data_inicio = request.query_params.get("data_inicio")
        data_fim = request.query_params.get("data_fim")

        if not data_inicio and not data_fim:
            today = timezone.now().date()
            data_inicio = data_fim = today

        serializer = DashboardSupervisorSerializer(
            data={
                "data_inicio": data_inicio,
                "data_fim": data_fim,
                "unidade_id": request.query_params.get("unidade_id"),
            },
            context={"queryset": qs},
        )

        serializer.is_valid(raise_exception=True)

        return Response({"success": True, "results": serializer.data})


class DashboardMonitorUnidadeAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()
    filterset_class = DashboardMonitorUnidadeFilter
    filter_backends = [DjangoFilterBackend]

    def get(self, request):
            qs = self.filter_queryset(self.get_queryset())

            data_inicio = request.query_params.get("data_inicio")
            data_fim = request.query_params.get("data_fim")

            if not data_inicio and not data_fim:
                today = timezone.now().date()
                data_inicio = data_fim = today
            input_data = {
                "data_inicio": data_inicio,
                "data_fim": data_fim,
                "unidade_id": request.query_params.get("unidade_id"),
            }
            serializer = DashboardMonitorUnidadeSerializer(
                data=input_data,
                context={"queryset": qs},
            )

            serializer.is_valid(raise_exception=True)

            return Response({"success": True, "results": serializer.data}, status=200)


class DashboardGestorAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()
    filterset_class = DashboardGestorFilter
    filter_backends = [DjangoFilterBackend]

    def get(self, request):
        try:
            filterset = self.filterset_class(
                data=request.query_params, queryset=Agendamento.objects.all()
            )
            qs = filterset.qs

            data_inicio = request.query_params.get("data_inicio")
            data_fim = request.query_params.get("data_fim")

            if not data_inicio and not data_fim:
                today = timezone.now().date()
                data_inicio = data_fim = today

            serializer = DashboardGestorSerializer(
                data={
                    "data_inicio": data_inicio,
                    "data_fim": data_fim,
                },
                context={"queryset": qs},
            )

            serializer.is_valid(raise_exception=True)

            return Response({"success": True, "results": serializer.data})
        except Exception as e:
            return Response(
                {
                    "success": False,
                    "error": "Erro interno ao gerar o dashboard.",
                    "detail": str(e),
                },
            )


class PerfilFamiliarAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = Prontuario.objects.all()

    def get(self, request):
        serializer = PerfilFamiliarSerializer(data={"cpf": request.query_params.get("cpf", "")})
        serializer.is_valid(raise_exception=True)

        payload = serializer.data
        if not payload.get("encontrado"):
            return Response({"success": False, "error": "Prontuário não encontrado."}, status=404)

        return Response({"success": True, "results": payload})


class MapaUnidadesQuerySerializer(serializers.Serializer):
    data_inicio = serializers.DateField(required=False)
    data_fim = serializers.DateField(required=False)


_COORD_NUMBER_RE = re.compile(r"[-+]?\d+(?:[.,]\d+)?")


def _extract_coord_numbers(value: str | None) -> list[float]:
    if not value:
        return []
    matches = _COORD_NUMBER_RE.findall(value.strip())
    numbers: list[float] = []
    for m in matches:
        try:
            numbers.append(float(m.replace(",", ".")))
        except ValueError:
            continue
    return numbers


def _parse_lat_lon(latitude_raw: str | float | int | None, longitude_raw: str | float | int | None) -> tuple[float | None, float | None]:
    lat = _extract_coord_numbers(str(latitude_raw) if isinstance(latitude_raw, str) else "")[:1]
    lon = _extract_coord_numbers(str(longitude_raw) if isinstance(longitude_raw, str) else "")[:1]

    latitude = float(latitude_raw) if isinstance(latitude_raw, (int, float)) else (lat[0] if lat else None)
    longitude = float(longitude_raw) if isinstance(longitude_raw, (int, float)) else (lon[0] if lon else None)

    if latitude is None or longitude is None:
        pair = []
        if isinstance(latitude_raw, str):
            pair = _extract_coord_numbers(latitude_raw)
        if len(pair) < 2 and isinstance(longitude_raw, str):
            pair = _extract_coord_numbers(longitude_raw)

        if len(pair) >= 2:
            if latitude is None:
                latitude = pair[0]
            if longitude is None:
                longitude = pair[1]

    if latitude is not None and not (-90 <= latitude <= 90):
        latitude = None
    if longitude is not None and not (-180 <= longitude <= 180):
        longitude = None

    return latitude, longitude


class MapaUnidadesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = UnidadeCras.objects.all()

    def get(self, request):
        params = MapaUnidadesQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)

        today = timezone.now().date()
        data_inicio = params.validated_data.get("data_inicio")
        data_fim = params.validated_data.get("data_fim")

        if data_inicio and not data_fim:
            data_fim = today
        if data_fim and not data_inicio:
            data_inicio = data_fim - timedelta(days=30)
        if not data_inicio and not data_fim:
            data_fim = today
            data_inicio = today - timedelta(days=30)

        if data_inicio > data_fim:
            raise serializers.ValidationError({"data_inicio": "data_inicio não pode ser maior que data_fim."})

        cache_key = f"mapa_unidades:v1:{data_inicio.isoformat()}:{data_fim.isoformat()}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        unidades = list(
            UnidadeCras.objects.filter(is_active=True)
            .select_related("bairro")
            .only(
                "id",
                "nome",
                "created_at",
                "logradouro",
                "numero",
                "complemento",
                "cep",
                "telefone",
                "email",
                "latitude",
                "longitude",
                "bairro_id",
                "bairro__nome",
            )
            .prefetch_related(
                Prefetch(
                    "bairros_abrangencia",
                    queryset=Bairro.objects.only("id", "nome"),
                    to_attr="bairros_abrangencia_prefetched",
                )
            )
            .order_by("nome")
        )
        unidade_ids = [u.id for u in unidades]

     
        agendamentos_total = (
            Agendamento.objects.filter(unidade_id__in=unidade_ids, data__range=(data_inicio, data_fim))
            .values("unidade_id")
            .annotate(total=Count("id"))
        )
        total_por_unidade = {str(r["unidade_id"]): int(r["total"] or 0) for r in agendamentos_total}

      
        origens_rows = (
            Agendamento.objects.filter(unidade_id__in=unidade_ids, data__range=(data_inicio, data_fim))
            .values("unidade_id", "origem")
            .annotate(total=Count("id"))
        )

        origens_por_unidade: dict[str, dict[str, int]] = defaultdict(lambda: {"156": 0, "RECEPCAO": 0, "SITE": 0, "FILA": 0})
        for r in origens_rows:
            uid = str(r["unidade_id"])
            origem = r.get("origem")
            if not origem:
                continue
            origem = str(origem)
            if origem in origens_por_unidade[uid]:
                origens_por_unidade[uid][origem] = int(r.get("total") or 0)

       
        profissionais_rows = (
            Usuario.objects.filter(is_active=True, unidades_lotacao__in=unidade_ids)
            .values("unidades_lotacao")
            .annotate(total=Count("id", distinct=True))
        )
        profissionais_por_unidade = {str(r["unidades_lotacao"]): int(r["total"] or 0) for r in profissionais_rows}

      
        avaliacao_rows = (
            Avaliacao.objects.filter(
                agendamento__unidade_id__in=unidade_ids,
                agendamento__data__range=(data_inicio, data_fim),
            )
            .values("agendamento__unidade_id")
            .annotate(media=Avg("nota"), total=Count("id"))
        )
        avaliacao_por_unidade = {
            str(r["agendamento__unidade_id"]): {"media": float(r["media"] or 0), "total": int(r["total"] or 0)}
            for r in avaliacao_rows
        }

       
        def minutes(t):
            if not t:
                return None
            return t.hour * 60 + t.minute + (t.second / 60)

        def diff_minutes(end, start):
            if not end or not start:
                return None
            return minutes(end) - minutes(start)

        finalizados_qs = (
            Agendamento.objects.filter(
                unidade_id__in=unidade_ids,
                data__range=(data_inicio, data_fim),
                situacao="FINALIZADO",
            )
            .values(
                "unidade_id",
                "servico_id",
                "servico__tipo_servico__nome",
                "servico__tipo_servico__tempo_atendimento",
                "horario",
                "data_hora_inicio_atendimento",
                "data_hora_fim_atendimento",
            )
        )

        finalizados_total_por_unidade: dict[str, int] = defaultdict(int)
        servicos_distintos_por_unidade: dict[str, set[str]] = defaultdict(set)
        finalizados_especializado_por_unidade: dict[str, int] = defaultdict(int)
        finalizados_comum_por_unidade: dict[str, int] = defaultdict(int)

        soma_duracao_por_unidade: dict[str, float] = defaultdict(float)
        cont_duracao_por_unidade: dict[str, int] = defaultdict(int)
        soma_espera_por_unidade: dict[str, float] = defaultdict(float)
        cont_espera_por_unidade: dict[str, int] = defaultdict(int)
        soma_esperado_por_unidade: dict[str, float] = defaultdict(float)

        for r in finalizados_qs.iterator(chunk_size=10000):
            uid = str(r.get("unidade_id") or "")
            if not uid:
                continue

            finalizados_total_por_unidade[uid] += 1

            servico_id = r.get("servico_id")
            if servico_id:
                servicos_distintos_por_unidade[uid].add(str(servico_id))

            tipo_nome = str(r.get("servico__tipo_servico__nome") or "").lower()
            if "especial" in tipo_nome:
                finalizados_especializado_por_unidade[uid] += 1
            else:
                finalizados_comum_por_unidade[uid] += 1

            esperado = r.get("servico__tipo_servico__tempo_atendimento") or 20
            try:
                esperado = int(esperado)
            except (TypeError, ValueError):
                esperado = 20

            inicio = r.get("data_hora_inicio_atendimento")
            fim = r.get("data_hora_fim_atendimento")
            agendado = r.get("horario")

            dur = diff_minutes(fim, inicio)
            if dur is not None and dur >= 0:
                cont_duracao_por_unidade[uid] += 1
                soma_duracao_por_unidade[uid] += dur
                soma_esperado_por_unidade[uid] += esperado

            espera = diff_minutes(inicio, agendado)
            if espera is not None:
                if espera < 0:
                    espera = 0
                cont_espera_por_unidade[uid] += 1
                soma_espera_por_unidade[uid] += espera

        resultados = []

        for u in unidades:
            uid = str(u.id)
            latitude, longitude = _parse_lat_lon(u.latitude, u.longitude)
            avaliacao_info = avaliacao_por_unidade.get(uid, {"media": 0, "total": 0})
            dur_count = cont_duracao_por_unidade.get(uid, 0) or 0
            espera_count = cont_espera_por_unidade.get(uid, 0) or 0

            tempo_medio_atendimento = (soma_duracao_por_unidade.get(uid, 0) / dur_count) if dur_count else 0
            tempo_medio_esperado = (soma_esperado_por_unidade.get(uid, 0) / dur_count) if dur_count else 0
            tempo_medio_espera = (soma_espera_por_unidade.get(uid, 0) / espera_count) if espera_count else 0
            excedente_medio = calculate_tempo_excedente_medio_min(tempo_medio_atendimento, tempo_medio_esperado)
            pct_acima = calculate_pct_acima_esperado(tempo_medio_atendimento, tempo_medio_esperado)

            bairros_abrangencia = [
                {"id": str(b.id), "nome": b.nome}
                for b in (getattr(u, "bairros_abrangencia_prefetched", None) or [])
            ]

            resultados.append(
                {
                    "id": uid,
                    "nome": u.nome,
                    "created_at": u.created_at.isoformat() if u.created_at else None,
                    "logradouro": u.logradouro,
                    "numero": u.numero,
                    "complemento": u.complemento,
                    "cep": u.cep,
                    "bairro": {"id": str(u.bairro_id), "nome": getattr(u.bairro, "nome", "")},
                    "telefone": u.telefone,
                    "email": u.email,
                    "latitude": latitude,
                    "longitude": longitude,
                    "bairros_abrangencia": bairros_abrangencia,
                    "metricas": {
                        "atendimentos_total": total_por_unidade.get(uid, 0),
                        "profissionais_total": profissionais_por_unidade.get(uid, 0),
                        "nota_avaliacao_media": round(float(avaliacao_info.get("media") or 0), 1),
                        "nota_avaliacao_total": int(avaliacao_info.get("total") or 0),
                        "tempo_medio_atendimento_min": round(tempo_medio_atendimento, 1),
                        "tempo_medio_esperado_min": round(tempo_medio_esperado, 1),
                        "tempo_medio_espera_min": round(tempo_medio_espera, 1),
                        "servicos_prestados_30d": int(finalizados_total_por_unidade.get(uid, 0) or 0),
                        "servicos_distintos_30d": len(servicos_distintos_por_unidade.get(uid, set())),
                        "tempo_excedente_medio_min": round(excedente_medio, 1),
                        "pct_acima_esperado": round(pct_acima, 1),
                        "atendimentos_comum_30d": int(finalizados_comum_por_unidade.get(uid, 0) or 0),
                        "atendimentos_especializado_30d": int(finalizados_especializado_por_unidade.get(uid, 0) or 0),
                        "origem_atendimentos": origens_por_unidade.get(uid, {"156": 0, "RECEPCAO": 0, "SITE": 0, "FILA": 0}),
                    },
                }
            )

        payload = {
            "success": True,
            "results": {
                "data_inicio": data_inicio,
                "data_fim": data_fim,
                "unidades": resultados,
            },
        }
        cache.set(cache_key, payload, timeout=60)

        resp = Response(payload)
        resp["Cache-Control"] = "private, max-age=60"
        return resp


class MapaUnidadeSeriesQuerySerializer(serializers.Serializer):
    unidade_id = serializers.UUIDField()
    data_inicio = serializers.DateField(required=False)
    data_fim = serializers.DateField(required=False)


class MapaUnidadeSeriesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = UnidadeCras.objects.all()

    def get(self, request):
        params = MapaUnidadeSeriesQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)

        unidade_id = str(params.validated_data["unidade_id"])
        unidade = UnidadeCras.objects.filter(id=unidade_id, is_active=True).only("id", "created_at").first()
        if not unidade:
            return Response({"success": False, "error": "Unidade não encontrada."}, status=404)

        today = timezone.now().date()
        created_date = unidade.created_at.date() if unidade.created_at else today

        data_inicio = params.validated_data.get("data_inicio") or created_date
        data_fim = params.validated_data.get("data_fim") or today

        if data_inicio < created_date:
            data_inicio = created_date

        if data_inicio > data_fim:
            raise serializers.ValidationError({"data_inicio": "data_inicio não pode ser maior que data_fim."})

        # Limite defensivo para evitar ranges absurdos
        max_days = 730
        if (data_fim - data_inicio).days > max_days:
            raise serializers.ValidationError({"detail": f"Período muito grande. Máximo: {max_days} dias."})

        cache_key = f"mapa_unidades_serie:v1:{unidade_id}:{data_inicio.isoformat()}:{data_fim.isoformat()}"
        cached = cache.get(cache_key)
        if cached:
            return Response(cached)

        def minutes(t):
            if not t:
                return None
            return t.hour * 60 + t.minute + (t.second / 60)

        def diff_minutes(end, start):
            if not end or not start:
                return None
            return minutes(end) - minutes(start)

        # Base de datas (preenche dias sem dados)
        days = []
        cursor = data_inicio
        while cursor <= data_fim:
            days.append(cursor)
            cursor += timedelta(days=1)

        serie = {
            d: {
                "data": d.isoformat(),
                "atendimentos_total": 0,
                "finalizados_total": 0,
                "tempo_medio_espera_min": 0,
                "tempo_medio_atendimento_min": 0,
                "tempo_medio_esperado_min": 0,
                "tempo_excedente_medio_min": 0,
                "pct_acima_esperado": 0,
                "nota_avaliacao_media": 0,
                "nota_avaliacao_total": 0,
            }
            for d in days
        }

        # Contagem total por dia (todas as situações)
        total_rows = (
            Agendamento.objects.filter(unidade_id=unidade_id, data__range=(data_inicio, data_fim))
            .values("data")
            .annotate(total=Count("id"))
        )
        for r in total_rows:
            d = r.get("data")
            if d in serie:
                serie[d]["atendimentos_total"] = int(r.get("total") or 0)

        # Avaliação por dia (nota 1-5) baseada na data do agendamento
        avaliacao_rows = (
            Avaliacao.objects.filter(
                agendamento__unidade_id=unidade_id,
                agendamento__data__range=(data_inicio, data_fim),
            )
            .values("agendamento__data")
            .annotate(media=Avg("nota"), total=Count("id"))
        )
        for r in avaliacao_rows:
            d = r.get("agendamento__data")
            if d in serie:
                serie[d]["nota_avaliacao_media"] = round(float(r.get("media") or 0), 1)
                serie[d]["nota_avaliacao_total"] = int(r.get("total") or 0)

        # Métricas de tempo por dia (somente FINALIZADO)
        finalizados_qs = (
            Agendamento.objects.filter(
                unidade_id=unidade_id,
                data__range=(data_inicio, data_fim),
                situacao="FINALIZADO",
            )
            .values(
                "data",
                "servico__tipo_servico__tempo_atendimento",
                "horario",
                "data_hora_inicio_atendimento",
                "data_hora_fim_atendimento",
            )
        )

        soma_duracao: dict[date, float] = defaultdict(float)
        cont_duracao: dict[date, int] = defaultdict(int)
        soma_espera: dict[date, float] = defaultdict(float)
        cont_espera: dict[date, int] = defaultdict(int)
        soma_esperado: dict[date, float] = defaultdict(float)
        finalizados_total: dict[date, int] = defaultdict(int)

        for r in finalizados_qs.iterator(chunk_size=10000):
            d = r.get("data")
            if not d:
                continue
            finalizados_total[d] += 1

            esperado = r.get("servico__tipo_servico__tempo_atendimento") or 20
            try:
                esperado = int(esperado)
            except (TypeError, ValueError):
                esperado = 20

            inicio = r.get("data_hora_inicio_atendimento")
            fim = r.get("data_hora_fim_atendimento")
            agendado = r.get("horario")

            dur = diff_minutes(fim, inicio)
            if dur is not None and dur >= 0:
                cont_duracao[d] += 1
                soma_duracao[d] += dur
                soma_esperado[d] += esperado

            espera = diff_minutes(inicio, agendado)
            if espera is not None:
                if espera < 0:
                    espera = 0
                cont_espera[d] += 1
                soma_espera[d] += espera

        for d in days:
            if d not in serie:
                continue

            dur_count = cont_duracao.get(d, 0) or 0
            espera_count = cont_espera.get(d, 0) or 0

            tempo_medio_atendimento = (soma_duracao.get(d, 0) / dur_count) if dur_count else 0
            tempo_medio_esperado = (soma_esperado.get(d, 0) / dur_count) if dur_count else 0
            tempo_medio_espera = (soma_espera.get(d, 0) / espera_count) if espera_count else 0
            excedente_medio = calculate_tempo_excedente_medio_min(tempo_medio_atendimento, tempo_medio_esperado)
            pct_acima = calculate_pct_acima_esperado(tempo_medio_atendimento, tempo_medio_esperado)

            serie[d]["finalizados_total"] = int(finalizados_total.get(d, 0) or 0)
            serie[d]["tempo_medio_atendimento_min"] = round(tempo_medio_atendimento, 1)
            serie[d]["tempo_medio_esperado_min"] = round(tempo_medio_esperado, 1)
            serie[d]["tempo_medio_espera_min"] = round(tempo_medio_espera, 1)
            serie[d]["tempo_excedente_medio_min"] = round(excedente_medio, 1)
            serie[d]["pct_acima_esperado"] = round(pct_acima, 1)

        payload = {
            "success": True,
            "results": {
                "unidade_id": unidade_id,
                "created_at": unidade.created_at.isoformat() if unidade.created_at else None,
                "data_inicio": data_inicio,
                "data_fim": data_fim,
                "serie": [serie[d] for d in days],
            },
        }
        cache.set(cache_key, payload, timeout=60)

        resp = Response(payload)
        resp["Cache-Control"] = "private, max-age=60"
        return resp


def _normalize_geo_key(value: str) -> str:
    value = unicodedata.normalize("NFD", value or "")
    value = "".join(ch for ch in value if unicodedata.category(ch) != "Mn")
    value = re.sub(r"[^a-z0-9 ]+", " ", value.lower())
    value = re.sub(r"\s+", " ", value).strip()
    return value


def _get_bairros_geojson_path() -> Path | None:
    candidates = [
        Path(settings.BASE_DIR) / "static" / "geo" / "bairros_fortaleza.geojson",
        Path(settings.BASE_DIR) / "Frontend" / "public" / "geo" / "bairros_fortaleza.geojson",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


@lru_cache(maxsize=1)
def _load_bairros_geojson_enriched() -> dict:
    path = _get_bairros_geojson_path()
    if not path:
        raise FileNotFoundError("GeoJSON de bairros não encontrado.")

    with open(path, "r", encoding="utf-8") as f:
        geojson = json.load(f)

    bairros = Bairro.objects.all().values("id", "nome")
    nome_to_id = { _normalize_geo_key(b["nome"]): str(b["id"]) for b in bairros }

    for feature in geojson.get("features", []) or []:
        props = feature.get("properties") or {}
        nome = props.get("Nome") or props.get("nome") or props.get("NAME") or props.get("name")
        if nome:
            bid = nome_to_id.get(_normalize_geo_key(str(nome)))
            if bid:
                props["bairro_id"] = bid
        feature["properties"] = props

    return geojson


class MapaBairrosGeojsonAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, DjangoModelPermissionsWithView]
    queryset = UnidadeCras.objects.all()

    def get(self, request):
        try:
            geojson = _load_bairros_geojson_enriched()
        except FileNotFoundError as e:
            return Response({"success": False, "error": str(e)}, status=404)
        resp = Response(geojson)
        resp["Content-Type"] = "application/geo+json"
        resp["Cache-Control"] = "public, max-age=3600"
        return resp
