"""Indicadores agregados do mapa: serviços e demanda de medicamentos por unidade."""

from collections import defaultdict

from django.db.models import Avg, Count, Q, Sum
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.exceptions import NotFound
from rest_framework.response import Response
from rest_framework.views import APIView

from agendamentos.models import Agendamento
from app.permissions import DjangoModelPermissionsWithView
from medicamentos.models import Medicamento
from prontuario.models import ReceitaMedicamento
from unidade_posto.models import ServicoUnidadePosto, UnidadePosto
from .sla import SITUACOES_ENCERRADAS, com_duracao, minutos


def pode_ver_analise_gestor(user):
    return bool(user and user.is_authenticated and (
        user.is_superuser or user.groups.filter(
            Q(name__iexact="gestor") | Q(name__iexact="administrador") | Q(name__iexact="admin")
        ).exists()
    ))


class GestorMapaPermission(permissions.BasePermission):
    def has_permission(self, request, view):
        return pode_ver_analise_gestor(request.user)


class PeriodoMapaSerializer(serializers.Serializer):
    data_inicio = serializers.DateField(default=timezone.localdate)
    data_fim = serializers.DateField(default=timezone.localdate)

    def validate(self, attrs):
        if attrs["data_inicio"] > attrs["data_fim"]:
            raise serializers.ValidationError("A data inicial deve ser anterior ou igual à data final.")
        return attrs


def itens_receita_periodo(unidade_ids, data_inicio, data_fim):
    # A demanda pertence à unidade que prescreveu, e não à unidade de origem do cidadão.
    return ReceitaMedicamento.objects.filter(
        is_active=True, receita__is_active=True,
        receita__agendamento__unidade_id__in=unidade_ids,
        receita__data_emissao__date__range=(data_inicio, data_fim),
    )


def campos_medicamento(row):
    return {
        "id": str(row["medicamento_id"]),
        "nome": row["medicamento__nome"],
        "concentracao": row["medicamento__concentracao"],
        "unidade_medida": row["medicamento__unidade_medida"],
        "forma_farmaceutica": row["medicamento__forma_farmaceutica"],
    }


CAMPOS_MEDICAMENTO = (
    "medicamento_id", "medicamento__nome", "medicamento__concentracao",
    "medicamento__unidade_medida", "medicamento__forma_farmaceutica",
)


def demanda_medicamentos(unidade_ids, data_inicio, data_fim, medicamento_id=None):
    itens = itens_receita_periodo(unidade_ids, data_inicio, data_fim).exclude(medicamento_id=None)
    if medicamento_id:
        itens = itens.filter(medicamento_id=medicamento_id)
    return itens.values("receita__agendamento__unidade_id", *CAMPOS_MEDICAMENTO).annotate(
        solicitacoes=Count("receita_id", distinct=True),
        prescrito_total=Sum("quantidade_prescrita"),
        dispensado_total=Sum("quantidade_dispensada"),
        itens_sem_quantidade=Count("id", filter=Q(quantidade_prescrita__isnull=True)),
    ).order_by("-solicitacoes", "medicamento__nome", "medicamento_id")


def analise_por_unidade(unidade_ids, data_inicio, data_fim):
    """Quatro consultas agregadas, independentemente do número de unidades."""
    ids = [str(uid) for uid in unidade_ids]
    resultado = {uid: {"servicos": [], "medicamentos": [], "itens_legados_sem_catalogo": 0,
                       "media_min": None, "medidos": 0, "concluidos": 0} for uid in ids}
    if not ids:
        return resultado
    servicos = defaultdict(dict)
    segundos_por_unidade = defaultdict(float)
    # Inclui a oferta cadastrada, mesmo quando o serviço não teve consultas no período.
    oferta = ServicoUnidadePosto.objects.filter(unidade_id__in=ids, is_active=True, servico__is_active=True).values(
        "unidade_id", "servico_id", "servico__nome", "servico__tipo_servico__tempo_atendimento",
    ).distinct()
    for row in oferta:
        servicos[str(row["unidade_id"])][str(row["servico_id"])] = {
            "id": str(row["servico_id"]), "nome": row["servico__nome"], "ofertado": True,
            "concluidos": 0, "medidos": 0, "media_min": None,
            "meta_min": row["servico__tipo_servico__tempo_atendimento"] or None,
        }
    concluidos = com_duracao(Agendamento.objects.filter(
        unidade_id__in=ids, data__range=(data_inicio, data_fim), situacao__in=SITUACOES_ENCERRADAS,
    )).values("unidade_id", "servico_id", "servico__nome", "servico__tipo_servico__tempo_atendimento").annotate(
        total=Count("id"), medidos=Count("duracao_sla"), media=Avg("duracao_sla"), soma=Sum("duracao_sla"),
    ).order_by()
    for row in concluidos:
        uid, sid = str(row["unidade_id"]), str(row["servico_id"])
        resultado[uid]["concluidos"] += row["total"]
        resultado[uid]["medidos"] += row["medidos"]
        if row["soma"] is not None:
            segundos_por_unidade[uid] += row["soma"].total_seconds()
        servicos[uid][sid] = {
            "id": sid, "nome": row["servico__nome"], "ofertado": sid in servicos[uid],
            "concluidos": row["total"], "medidos": row["medidos"], "media_min": minutos(row["media"]),
            "meta_min": row["servico__tipo_servico__tempo_atendimento"] or None,
        }
    for uid in ids:
        resultado[uid]["servicos"] = sorted(servicos[uid].values(), key=lambda item: item["nome"].casefold())
        if resultado[uid]["medidos"]:
            resultado[uid]["media_min"] = round(segundos_por_unidade[uid] / 60 / resultado[uid]["medidos"], 2)
    for row in demanda_medicamentos(ids, data_inicio, data_fim):
        uid = str(row["receita__agendamento__unidade_id"])
        # O ranking usa receitas, não o número de comprimidos/frascos de apresentações diferentes.
        resultado[uid]["medicamentos"].append({
            **campos_medicamento(row), "solicitacoes": row["solicitacoes"],
            "quantidade_prescrita": row["prescrito_total"],
            "quantidade_dispensada": row["dispensado_total"],
            "itens_sem_quantidade": row["itens_sem_quantidade"],
        })
    legados = itens_receita_periodo(ids, data_inicio, data_fim).filter(medicamento_id=None).values(
        "receita__agendamento__unidade_id",
    ).annotate(total=Count("id")).order_by()
    for row in legados:
        resultado[str(row["receita__agendamento__unidade_id"])]["itens_legados_sem_catalogo"] = row["total"]
    return resultado


class MedicamentosMapaParams(PeriodoMapaSerializer):
    medicamento_id = serializers.UUIDField(required=False)


class MedicamentosMapaAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, GestorMapaPermission, DjangoModelPermissionsWithView]
    queryset = UnidadePosto.objects.all()

    def get(self, request):
        params = MedicamentosMapaParams(data=request.query_params)
        params.is_valid(raise_exception=True)
        inicio, fim = params.validated_data["data_inicio"], params.validated_data["data_fim"]
        unidades = list(UnidadePosto.objects.filter(is_active=True).values("id", "nome").order_by("nome"))
        ids = [u["id"] for u in unidades]
        prescritos = itens_receita_periodo(ids, inicio, fim).exclude(medicamento_id=None)
        totais = dict(prescritos.values("medicamento_id").annotate(
            total=Count("receita_id", distinct=True),
        ).values_list("medicamento_id", "total"))
        selecionado = params.validated_data.get("medicamento_id")
        # Mantém a seleção histórica ao trocar o período, mesmo sem novas solicitações.
        catalogo = list(Medicamento.objects.filter(Q(is_active=True) | Q(id__in=totais) | Q(id=selecionado)).order_by(
            "nome", "concentracao", "forma_farmaceutica", "id",
        ).values("id", "nome", "concentracao", "unidade_medida", "forma_farmaceutica"))
        for med in catalogo:
            med["solicitacoes"] = totais.get(med["id"], 0)
        if selecionado is None and catalogo:
            selecionado = max(catalogo, key=lambda med: med["solicitacoes"])["id"]
        medicamento = next((m for m in catalogo if m["id"] == selecionado), None)
        if selecionado and medicamento is None:
            raise NotFound("Medicamento não encontrado no catálogo deste período.")
        demanda = {str(row["receita__agendamento__unidade_id"]): row
                   for row in demanda_medicamentos(ids, inicio, fim, selecionado)} if selecionado else {}
        pontos = []
        for unidade in unidades:
            row = demanda.get(str(unidade["id"]), {})
            pontos.append({
                "unidade_id": str(unidade["id"]), "nome": unidade["nome"],
                "solicitacoes": row.get("solicitacoes", 0),
                "quantidade_prescrita": row.get("prescrito_total"),
                "quantidade_dispensada": row.get("dispensado_total", 0),
                "itens_sem_quantidade": row.get("itens_sem_quantidade", 0),
            })
        return Response({"success": True, "results": {
            "data_inicio": inicio, "data_fim": fim, "medicamento": medicamento,
            "medicamentos": catalogo, "unidades": pontos,
            "total_solicitacoes": sum(p["solicitacoes"] for p in pontos),
            "maior_demanda": max((p["solicitacoes"] for p in pontos), default=0),
        }})
