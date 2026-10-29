import json
import re
import unicodedata
from datetime import timedelta
from functools import lru_cache
from pathlib import Path

from django.conf import settings
from django.core.cache import cache
from django.db.models import Count, Prefetch
from django.utils import timezone
from django.utils.cache import patch_vary_headers
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics

from agendamentos.models import Agendamento
from app.models import Bairro
from app.permissions import DjangoModelPermissionsWithView
from unidade_posto.models import UnidadePosto
from usuarios.models import Usuario

from .filters import DashboardGestorFilter, DashboardMonitorUnidadeFilter, DashboardSupervisorFilter
from .permissoes import GestaoPermission
from . import indicadores
from .supervisor import SupervisorScopeMixin
from .serializers import (
    DashboardGestorSerializer,
    DashboardMonitorUnidadeSerializer,
    DashboardSupervisorSerializer,
)
class DashboardSupervisorAPIView(SupervisorScopeMixin, generics.GenericAPIView):
    queryset = Agendamento.objects.all()
    filterset_class = DashboardSupervisorFilter
    filter_backends = [DjangoFilterBackend]

    def get(self, request):
        qs = self.filter_queryset(self.get_queryset())
        serializer = DashboardSupervisorSerializer(
            data=self.periodo,
            context={"queryset": qs},
        )

        serializer.is_valid(raise_exception=True)

        return Response({"success": True, "results": serializer.data})


class DashboardMonitorUnidadeAPIView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated, GestaoPermission, DjangoModelPermissionsWithView]
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
    permission_classes = [permissions.IsAuthenticated, GestaoPermission, DjangoModelPermissionsWithView]
    queryset = Agendamento.objects.all()
    filterset_class = DashboardGestorFilter
    filter_backends = [DjangoFilterBackend]

    def get(self, request):
        # Erros de validação viram 400 e falhas inesperadas viram 500, sem expor detalhes internos.
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


def _resposta_privada(payload):
    """O navegador só reaproveita a resposta para o mesmo usuário (mesmo token)."""
    resp = Response(payload)
    resp["Cache-Control"] = "private, max-age=60"
    patch_vary_headers(resp, ("Authorization",))
    return resp


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
    permission_classes = [permissions.IsAuthenticated, GestaoPermission, DjangoModelPermissionsWithView]
    queryset = UnidadePosto.objects.all()

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

        cache_key = f"mapa_unidades:v2:{data_inicio.isoformat()}:{data_fim.isoformat()}"
        cached = cache.get(cache_key)
        if cached:
            return _resposta_privada(cached)

        unidades = list(
            UnidadePosto.objects.filter(is_active=True)
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
        metricas_por_unidade = indicadores.metricas_mapa_por_unidade(unidade_ids, data_inicio, data_fim)

        profissionais_rows = (
            Usuario.objects.filter(is_active=True, unidades_lotacao__in=unidade_ids)
            .values("unidades_lotacao")
            .annotate(total=Count("id", distinct=True))
        )
        profissionais_por_unidade = {str(r["unidades_lotacao"]): int(r["total"] or 0) for r in profissionais_rows}


        resultados = []

        for u in unidades:
            uid = str(u.id)
            latitude, longitude = _parse_lat_lon(u.latitude, u.longitude)

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
                        **metricas_por_unidade[uid],
                        "profissionais_total": profissionais_por_unidade.get(uid, 0),
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

        return _resposta_privada(payload)


class MapaUnidadeSeriesQuerySerializer(serializers.Serializer):
    unidade_id = serializers.UUIDField()
    data_inicio = serializers.DateField(required=False)
    data_fim = serializers.DateField(required=False)


class MapaUnidadeSeriesAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, GestaoPermission, DjangoModelPermissionsWithView]
    queryset = UnidadePosto.objects.all()

    def get(self, request):
        params = MapaUnidadeSeriesQuerySerializer(data=request.query_params)
        params.is_valid(raise_exception=True)

        unidade_id = str(params.validated_data["unidade_id"])
        unidade = UnidadePosto.objects.filter(id=unidade_id, is_active=True).only("id", "created_at").first()
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

        cache_key = f"mapa_unidades_serie:v2:{unidade_id}:{data_inicio.isoformat()}:{data_fim.isoformat()}"
        cached = cache.get(cache_key)
        if cached:
            return _resposta_privada(cached)

        # Base de datas (preenche dias sem dados)
        days = []
        cursor = data_inicio
        while cursor <= data_fim:
            days.append(cursor)
            cursor += timedelta(days=1)

        periodo = Agendamento.objects.filter(unidade_id=unidade_id, data__range=(data_inicio, data_fim))
        totais = dict(periodo.values("data").annotate(total=Count("id")).order_by().values_list("data", "total"))
        tempos = indicadores.tempos_por(periodo, "data")

        serie = []
        for d in days:
            resumo = tempos[d].resumo() if d in tempos else indicadores.Tempos().resumo()
            serie.append({
                "data": d.isoformat(),
                "atendimentos_total": totais.get(d, 0),
                # Consultas encerradas, incluindo as que seguiram para a farmácia.
                "finalizados_total": resumo["encerrados"],
                "tempo_medio_espera_min": resumo["tempo_medio_espera_min"],
                "tempo_medio_atendimento_min": resumo["tempo_medio_atendimento_min"],
                "tempo_medio_esperado_min": resumo["tempo_medio_esperado_min"],
                "tempo_excedente_medio_min": resumo["tempo_excedente_medio_min"],
                "pct_acima_esperado": resumo["pct_acima_esperado"],
                "pct_dentro_meta": resumo["pct_dentro_meta"],
            })

        payload = {
            "success": True,
            "results": {
                "unidade_id": unidade_id,
                "created_at": unidade.created_at.isoformat() if unidade.created_at else None,
                "data_inicio": data_inicio,
                "data_fim": data_fim,
                "serie": serie,
            },
        }
        cache.set(cache_key, payload, timeout=60)

        return _resposta_privada(payload)


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
    queryset = UnidadePosto.objects.all()

    def get(self, request):
        try:
            geojson = _load_bairros_geojson_enriched()
        except FileNotFoundError as e:
            return Response({"success": False, "error": str(e)}, status=404)
        resp = Response(geojson)
        resp["Content-Type"] = "application/geo+json"
        resp["Cache-Control"] = "public, max-age=3600"
        return resp
