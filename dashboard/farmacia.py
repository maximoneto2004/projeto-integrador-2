"""Painel "Farmácia da Unidade": fila de retirada, cobertura do estoque, validade e rupturas."""

from collections import defaultdict
from datetime import timedelta

from django.db.models import Count, F, Min, Q, Sum
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from agendamentos.models import Agendamento
from app.static_data import (
    GRUPO_ADMINISTRADOR,
    GRUPO_FARMACEUTICO,
    GRUPO_SUPERVISOR,
    STATUS_DISPENSACAO_DISPENSADO,
    STATUS_DISPENSACAO_PARCIAL,
    STATUS_DISPENSACAO_PENDENTE,
    TIPO_MOVIMENTACAO_PERDA,
    TIPO_MOVIMENTACAO_SAIDA,
)
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from medicamentos.services import calcular_alertas, calcular_saldos, garantir_acesso_unidade
from prontuario.models import ReceitaMedicamento
from unidade_posto.models import UnidadePosto
from .indicadores import SITUACOES_RETIRADA
from .sla import combinar_horario

DIAS_HISTORICO = 30
DIAS_VENCIMENTO = 30
MESES_VALIDADE = 6
# Cobertura abaixo disso entra em alerta: não dá tempo de repor antes de faltar.
COBERTURA_ALERTA_DIAS = 7
SERIES_SAIDA = 4


class FarmaciaPermission(permissions.BasePermission):
    message = "O painel da farmácia é do farmacêutico, do supervisor e do administrador."

    def has_permission(self, request, view):
        user = request.user
        grupos = {GRUPO_FARMACEUTICO.lower(), GRUPO_SUPERVISOR.lower(), GRUPO_ADMINISTRADOR.lower()}
        return bool(user and user.is_authenticated and (
            user.is_superuser or {nome.lower() for nome in user.groups.values_list("name", flat=True)} & grupos
        ))


class FarmaciaParams(serializers.Serializer):
    unidade_id = serializers.UUIDField()


def minutos_entre(inicio, fim):
    return max(round((fim - inicio).total_seconds() / 60), 0)


def fim_da_consulta(agendamento):
    return agendamento.fim_atendimento_em or combinar_horario(agendamento.data, agendamento.data_hora_fim_atendimento)


def fila_de_retirada(unidade, agora):
    fila = (
        Agendamento.objects.filter(unidade=unidade, situacao__in=SITUACOES_RETIRADA)
        .select_related("cidadao", "farmaceutico").order_by("fim_atendimento_em", "horario")
    )
    itens = []
    for agendamento in fila:
        fim = fim_da_consulta(agendamento)
        itens.append({
            "id": str(agendamento.id),
            "cidadao_nome": agendamento.cidadao.nome,
            "situacao": agendamento.situacao,
            "situacao_nome": agendamento.get_situacao_display(),
            "farmaceutico_nome": agendamento.farmaceutico.nome_completo if agendamento.farmaceutico else None,
            "fim_consulta": fim.isoformat() if fim else None,
            # A espera na farmácia começa quando a consulta termina.
            "espera_min": minutos_entre(fim, agora) if fim else None,
        })
    return itens


def tempo_ate_dispensacao(unidade, inicio, fim):
    """Do fim da consulta até a primeira saída de estoque da receita, para quem saiu com retirada imediata."""
    encaminhados = Agendamento.objects.filter(unidade=unidade, retirar_medicamento=True, data__range=(inicio, fim))
    primeiras = dict(
        MovimentacaoEstoque.objects.filter(tipo=TIPO_MOVIMENTACAO_SAIDA, receita_item__receita__agendamento__in=encaminhados)
        .values("receita_item__receita__agendamento_id").annotate(primeira=Min("data"))
        .values_list("receita_item__receita__agendamento_id", "primeira")
    )
    esperas = []
    for agendamento in encaminhados.filter(pk__in=primeiras):
        fim_consulta = fim_da_consulta(agendamento)
        if fim_consulta and primeiras[agendamento.pk] >= fim_consulta:
            esperas.append(minutos_entre(fim_consulta, primeiras[agendamento.pk]))
    return {
        "atendidos": len(esperas),
        "tempo_medio_min": round(sum(esperas) / len(esperas), 1) if esperas else None,
    }


def saidas_por_medicamento(unidade, inicio):
    return MovimentacaoEstoque.objects.filter(
        lote__unidade=unidade, tipo=TIPO_MOVIMENTACAO_SAIDA, data__date__gte=inicio,
    )


def cobertura(unidade, inicio):
    consumo = dict(
        saidas_por_medicamento(unidade, inicio).values("lote__medicamento_id")
        .annotate(total=Sum("quantidade")).values_list("lote__medicamento_id", "total")
    )
    saldos = {s["medicamento_id"]: s for s in calcular_saldos(UnidadePosto.objects.filter(pk=unidade.pk))}
    nomes = {m.id: str(m) for m in Medicamento.objects.filter(id__in=set(consumo) | set(saldos))}
    linhas = []
    for medicamento_id in set(consumo) | set(saldos):
        saldo = saldos.get(medicamento_id, {})
        consumido = -(consumo.get(medicamento_id) or 0)
        diario = consumido / DIAS_HISTORICO
        disponivel = saldo.get("saldo_disponivel", 0)
        dias = round(disponivel / diario, 1) if diario else None
        linhas.append({
            "medicamento_id": str(medicamento_id),
            "medicamento": nomes[medicamento_id],
            "saldo_disponivel": disponivel,
            "saldo_vencido": saldo.get("saldo_vencido", 0),
            "estoque_minimo": saldo.get("estoque_minimo", 0),
            "consumo_30d": consumido,
            "consumo_diario": round(diario, 2),
            "dias_cobertura": dias,
            "em_alerta": disponivel == 0 or (dias is not None and dias < COBERTURA_ALERTA_DIAS),
        })
    # Sem consumo no período, a cobertura é indefinida: vai para o fim da lista.
    return sorted(linhas, key=lambda l: (l["dias_cobertura"] is None, l["dias_cobertura"] or 0, l["medicamento"]))


def saidas_diarias(unidade, inicio, hoje, linhas_cobertura):
    principais = [l for l in sorted(linhas_cobertura, key=lambda l: -l["consumo_30d"]) if l["consumo_30d"] > 0][:SERIES_SAIDA]
    por_dia = defaultdict(int)
    for mov in saidas_por_medicamento(unidade, inicio).filter(
        lote__medicamento_id__in=[l["medicamento_id"] for l in principais],
    ).values("lote__medicamento_id", "data", "quantidade"):
        por_dia[(str(mov["lote__medicamento_id"]), timezone.localtime(mov["data"]).date())] -= mov["quantidade"]
    dias = [inicio + timedelta(days=n) for n in range((hoje - inicio).days + 1)]
    return {
        "medicamentos": [{"id": l["medicamento_id"], "nome": l["medicamento"]} for l in principais],
        "dias": [
            {"data": dia.isoformat(), **{l["medicamento_id"]: por_dia[(l["medicamento_id"], dia)] for l in principais}}
            for dia in dias
        ],
    }


def itens_de_receita(unidade, inicio, hoje):
    itens = ReceitaMedicamento.objects.filter(
        is_active=True, receita__is_active=True, receita__agendamento__unidade=unidade,
        receita__data_emissao__date__range=(inicio, hoje),
    )
    totais = itens.aggregate(
        total=Count("id"),
        dispensados=Count("id", filter=Q(status_dispensacao=STATUS_DISPENSACAO_DISPENSADO)),
        parciais=Count("id", filter=Q(status_dispensacao=STATUS_DISPENSACAO_PARCIAL)),
        pendentes=Count("id", filter=Q(status_dispensacao=STATUS_DISPENSACAO_PENDENTE)),
    )
    semanas = defaultdict(lambda: {"dispensados": 0, "parciais": 0, "pendentes": 0})
    chave = {
        STATUS_DISPENSACAO_DISPENSADO: "dispensados",
        STATUS_DISPENSACAO_PARCIAL: "parciais",
        STATUS_DISPENSACAO_PENDENTE: "pendentes",
    }
    for item in itens.values("status_dispensacao", "receita__data_emissao"):
        dia = timezone.localtime(item["receita__data_emissao"]).date()
        semana = dia - timedelta(days=dia.weekday())
        if item["status_dispensacao"] in chave:
            semanas[semana][chave[item["status_dispensacao"]]] += 1
    totais["pct_integral"] = round(totais["dispensados"] / totais["total"] * 100, 1) if totais["total"] else None
    totais["semanas"] = [{"semana": s.isoformat(), **v} for s, v in sorted(semanas.items())]
    return itens, totais


def rupturas(itens, linhas_cobertura):
    saldo = {l["medicamento_id"]: l["saldo_disponivel"] for l in linhas_cobertura}
    faltas = (
        itens.filter(status_dispensacao__in=[STATUS_DISPENSACAO_PENDENTE, STATUS_DISPENSACAO_PARCIAL])
        .exclude(medicamento_id=None).exclude(quantidade_prescrita=None)
        .values("medicamento_id").annotate(
            itens=Count("id"), faltante=Sum(F("quantidade_prescrita") - F("quantidade_dispensada")),
        )
    )
    nomes = {m.id: str(m) for m in Medicamento.objects.filter(id__in=[f["medicamento_id"] for f in faltas])}
    linhas = []
    for falta in faltas:
        disponivel = saldo.get(str(falta["medicamento_id"]), 0)
        # Só é ruptura quando o estoque não cobre o que ainda falta entregar.
        if falta["faltante"] and disponivel < falta["faltante"]:
            linhas.append({
                "medicamento_id": str(falta["medicamento_id"]),
                "medicamento": nomes[falta["medicamento_id"]],
                "itens_pendentes": falta["itens"],
                "quantidade_faltante": falta["faltante"],
                "saldo_disponivel": disponivel,
            })
    return sorted(linhas, key=lambda l: (-(l["quantidade_faltante"] - l["saldo_disponivel"]), l["medicamento"]))


def validade_dos_lotes(unidade, hoje):
    lotes = LoteMedicamento.objects.filter(is_active=True, unidade=unidade, quantidade_atual__gt=0)
    vencidos = lotes.filter(validade__lt=hoje).aggregate(lotes=Count("id"), quantidade=Sum("quantidade_atual"))
    meses = []
    inicio = hoje.replace(day=1)
    for n in range(MESES_VALIDADE):
        ano, mes = divmod(inicio.month - 1 + n, 12)
        primeiro = inicio.replace(year=inicio.year + ano, month=mes + 1)
        ano2, mes2 = divmod(primeiro.month, 12)
        proximo = primeiro.replace(year=primeiro.year + ano2, month=mes2 + 1)
        dados = lotes.filter(validade__gte=max(primeiro, hoje), validade__lt=proximo).aggregate(
            lotes=Count("id"), quantidade=Sum("quantidade_atual"),
        )
        meses.append({"mes": primeiro.isoformat()[:7], "lotes": dados["lotes"], "quantidade": dados["quantidade"] or 0})
    return {"vencidos": {"lotes": vencidos["lotes"], "quantidade": vencidos["quantidade"] or 0}, "meses": meses}


class FarmaciaAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, FarmaciaPermission]

    def get(self, request):
        params = FarmaciaParams(data=request.query_params)
        params.is_valid(raise_exception=True)
        unidade = UnidadePosto.objects.filter(pk=params.validated_data["unidade_id"]).first()
        if unidade is None:
            raise serializers.ValidationError({"unidade_id": "Unidade não encontrada."})
        garantir_acesso_unidade(request.user, unidade)

        agora = timezone.now()
        hoje = timezone.localdate()
        inicio = hoje - timedelta(days=DIAS_HISTORICO - 1)
        fila = fila_de_retirada(unidade, agora)
        esperas = [item["espera_min"] for item in fila if item["espera_min"] is not None]
        linhas_cobertura = cobertura(unidade, inicio)
        itens, receitas = itens_de_receita(unidade, inicio, hoje)
        alertas = calcular_alertas(UnidadePosto.objects.filter(pk=unidade.pk), dias_vencimento=DIAS_VENCIMENTO)
        perdas = MovimentacaoEstoque.objects.filter(
            lote__unidade=unidade, tipo=TIPO_MOVIMENTACAO_PERDA, data__date__gte=inicio,
        ).aggregate(total=Sum("quantidade"))["total"] or 0
        receitas_hoje = MovimentacaoEstoque.objects.filter(
            lote__unidade=unidade, tipo=TIPO_MOVIMENTACAO_SAIDA, data__date=hoje, receita_item__isnull=False,
        ).values("receita_item__receita_id").distinct().count()

        return Response({"success": True, "results": {
            "data": hoje,
            "historico_inicio": inicio,
            "resumo": {
                "fila_retirada": len(fila),
                "chamando": sum(item["situacao"] == "CHAMANDO_RETIRADA" for item in fila),
                "maior_espera_min": max(esperas, default=None),
                "receitas_atendidas_hoje": receitas_hoje,
                "pct_itens_integrais": receitas["pct_integral"],
                "medicamentos_abaixo_minimo": len(alertas["estoque_baixo"]),
                "lotes_vencendo": alertas["vencendo"].count(),
                "lotes_vencidos": alertas["vencidos"].count(),
                "perdas_30d": -perdas,
            },
            "tempo_ate_dispensacao": tempo_ate_dispensacao(unidade, inicio, hoje),
            "fila": fila,
            "cobertura": linhas_cobertura,
            "cobertura_alerta_dias": COBERTURA_ALERTA_DIAS,
            "saidas_diarias": saidas_diarias(unidade, inicio, hoje, linhas_cobertura),
            "itens_receita": receitas,
            "rupturas": rupturas(itens, linhas_cobertura),
            "validade": validade_dos_lotes(unidade, hoje),
        }})
