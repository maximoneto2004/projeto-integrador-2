"""Indicadores por bairro de residência, para as camadas coropléticas do mapa."""

import re
import unicodedata
from collections import defaultdict
from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from agendamentos.models import Agendamento
from app.models import Bairro
from unidade_posto.models import UnidadePosto
from . import indicadores
from .permissoes import GestaoPermission

DIAS_PADRAO = 30


def normalizar_nome_geo(valor):
    """Mesma regra do frontend: sem acento, minúsculo, só letras, números e espaços simples."""
    valor = unicodedata.normalize("NFD", valor or "")
    valor = "".join(ch for ch in valor if unicodedata.category(ch) != "Mn")
    valor = re.sub(r"[^a-z0-9 ]+", " ", valor.lower())
    return re.sub(r"\s+", " ", valor).strip()


class PeriodoBairrosSerializer(serializers.Serializer):
    data_inicio = serializers.DateField(required=False)
    data_fim = serializers.DateField(required=False)

    def validate(self, attrs):
        fim = attrs.get("data_fim") or timezone.localdate()
        inicio = attrs.get("data_inicio") or fim - timedelta(days=DIAS_PADRAO - 1)
        if inicio > fim:
            raise serializers.ValidationError("A data inicial deve ser anterior ou igual à data final.")
        return {"data_inicio": inicio, "data_fim": fim}


def unidades_de_referencia():
    """Bairro -> unidades que o têm como área de abrangência."""
    referencia = defaultdict(list)
    for unidade_id, nome, bairro_id in UnidadePosto.objects.filter(is_active=True).values_list(
        "id", "nome", "bairros_abrangencia",
    ).order_by("nome"):
        if bairro_id:
            referencia[bairro_id].append({"id": str(unidade_id), "nome": nome})
    return referencia


def indicadores_por_bairro(inicio, fim):
    periodo = Agendamento.objects.filter(data__range=(inicio, fim))
    encerrados = periodo.filter(situacao__in=indicadores.SITUACOES_ENCERRADAS)
    contagens = indicadores.contar_por(periodo, "cidadao__bairro_id")
    pacientes = dict(
        encerrados.values("cidadao__bairro_id").annotate(total=Count("cidadao_id", distinct=True))
        .order_by().values_list("cidadao__bairro_id", "total")
    )
    referencia = unidades_de_referencia()
    abrangencia = defaultdict(set)
    for bairro_id, unidades in referencia.items():
        for unidade in unidades:
            abrangencia[unidade["id"]].add(bairro_id)

    # Onde os moradores de cada bairro foram atendidos, para medir o atendimento fora do território.
    fora = defaultdict(int)
    destinos = defaultdict(list)
    for linha in encerrados.values("cidadao__bairro_id", "unidade_id", "unidade__nome").annotate(total=Count("id")).order_by("-total"):
        bairro_id = linha["cidadao__bairro_id"]
        if bairro_id is None:
            continue
        destinos[bairro_id].append({"unidade": linha["unidade__nome"], "consultas": linha["total"]})
        if bairro_id not in abrangencia[str(linha["unidade_id"])]:
            fora[bairro_id] += linha["total"]

    cronicos = defaultdict(set)
    for cidadao_id, bairro_id, condicoes in encerrados.exclude(cidadao__condicoes_cronicas__isnull=True).exclude(
        cidadao__condicoes_cronicas="",
    ).values_list("cidadao_id", "cidadao__bairro_id", "cidadao__condicoes_cronicas"):
        if condicoes.strip():
            cronicos[bairro_id].add(cidadao_id)

    resultado = []
    for bairro in Bairro.objects.filter(is_active=True).order_by("nome"):
        contagem = contagens.get(str(bairro.id), {})
        consultas = contagem.get("encerrados", 0)
        resultado.append({
            "bairro_id": str(bairro.id),
            "nome": bairro.nome,
            "chave": normalizar_nome_geo(bairro.nome),
            "agendamentos": contagem.get("total", 0),
            "consultas": consultas,
            "pacientes": pacientes.get(bairro.id, 0),
            "ausentes": contagem.get("ausentes", 0),
            "absenteismo": contagem.get("taxa_absenteismo") if contagem else None,
            "base_absenteismo": contagem.get("ausentes", 0) + contagem.get("compareceram", 0),
            "consultas_fora_territorio": fora[bairro.id],
            "pct_fora_territorio": round(fora[bairro.id] / consultas * 100, 1) if consultas else None,
            "pacientes_cronicos": len(cronicos[bairro.id]),
            "unidades_referencia": referencia.get(bairro.id, []),
            "atendidos_em": destinos[bairro.id][:3],
        })
    sem_bairro = contagens.get("None", {})
    return {
        "data_inicio": inicio,
        "data_fim": fim,
        "bairros": resultado,
        "sem_bairro": {"agendamentos": sem_bairro.get("total", 0), "consultas": sem_bairro.get("encerrados", 0)},
    }


class BairrosIndicadoresAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, GestaoPermission]

    def get(self, request):
        params = PeriodoBairrosSerializer(data=request.query_params)
        params.is_valid(raise_exception=True)
        periodo = params.validated_data
        return Response({"success": True, "results": indicadores_por_bairro(periodo["data_inicio"], periodo["data_fim"])})
