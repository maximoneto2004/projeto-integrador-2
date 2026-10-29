"""Painel "Fluxo do Dia" da recepção: quem deve chegar, quem está atrasado e onde há vaga para encaixe."""

from collections import defaultdict

from django.db.models import Count, F, Q
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from agendamentos.models import AgendaVaga, Agendamento
from app.static_data import GRUPO_ADMINISTRADOR, GRUPO_RECEPCIONISTA, GRUPO_SUPERVISOR
from fila_espera.models import FilaEspera
from medicamentos.services import garantir_acesso_unidade
from unidade_posto.models import UnidadePosto
from . import indicadores
from .sla import combinar_horario

PROXIMOS_HORARIOS = 4


class RecepcaoPermission(permissions.BasePermission):
    message = "O fluxo do dia é da recepção, do supervisor e do administrador."

    def has_permission(self, request, view):
        user = request.user
        grupos = {GRUPO_RECEPCIONISTA.lower(), GRUPO_SUPERVISOR.lower(), GRUPO_ADMINISTRADOR.lower()}
        return bool(user and user.is_authenticated and (
            user.is_superuser or {nome.lower() for nome in user.groups.values_list("name", flat=True)} & grupos
        ))


class RecepcaoParams(serializers.Serializer):
    unidade_id = serializers.UUIDField()


def cadastro_incompleto(cidadao):
    faltando = []
    if not cidadao.telefone:
        faltando.append("telefone")
    if not cidadao.bairro_id:
        faltando.append("bairro")
    if not cidadao.cns:
        faltando.append("CNS")
    if not cidadao.data_nascimento:
        faltando.append("data de nascimento")
    return faltando


def vagas_livres(unidade, hoje, agora):
    """Horários ainda por vir com vaga sobrando, agrupados por tipo de serviço."""
    vagas = (
        AgendaVaga.objects.filter(unidade=unidade, data=hoje, horario__gte=timezone.localtime(agora).time())
        .filter(vagas__gt=F("vagas_ocupadas")).select_related("tipo_servico").order_by("horario")
    )
    por_tipo = defaultdict(lambda: {"livres": 0, "horarios": []})
    for vaga in vagas:
        nome = vaga.tipo_servico.nome if vaga.tipo_servico else "Sem tipo"
        tipo = por_tipo[nome]
        tipo["livres"] += vaga.vagas - vaga.vagas_ocupadas
        if len(tipo["horarios"]) < PROXIMOS_HORARIOS:
            tipo["horarios"].append(vaga.horario.strftime("%H:%M"))
    return sorted(({"tipo_servico": nome, **dados} for nome, dados in por_tipo.items()), key=lambda l: -l["livres"])


def fila_de_espera(unidade, agora):
    fila = FilaEspera.objects.filter(unidade=unidade, status="AGUARDANDO_FILA", is_active=True)
    resumo = fila.aggregate(
        total=Count("id"),
        preferencial=Count("id", filter=Q(prioridade="PREFERENCIAL")),
        preferencial_80=Count("id", filter=Q(prioridade="PREFERENCIAL+")),
        urgentes=Count("id", filter=Q(urgencia="ALTA")),
    )
    mais_antiga = fila.order_by("created_at").values_list("created_at", flat=True).first()
    resumo["espera_mais_antiga_min"] = round((agora - mais_antiga).total_seconds() / 60) if mais_antiga else None
    resumo["por_servico"] = list(
        fila.values(servico_nome=F("servico__nome")).annotate(total=Count("id")).order_by("-total", "servico_nome")
    )
    return resumo


class RecepcaoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, RecepcaoPermission]

    def get(self, request):
        params = RecepcaoParams(data=request.query_params)
        params.is_valid(raise_exception=True)
        unidade = UnidadePosto.objects.filter(pk=params.validated_data["unidade_id"]).first()
        if unidade is None:
            raise serializers.ValidationError({"unidade_id": "Unidade não encontrada."})
        garantir_acesso_unidade(request.user, unidade)

        agora = timezone.now()
        hoje = timezone.localdate()
        do_dia = Agendamento.objects.filter(unidade=unidade, data=hoje)
        contagens = indicadores.contar(do_dia)
        hora_atual = timezone.localtime(agora).time()

        atrasados = []
        for agendamento in do_dia.filter(situacao="AGENDADO", horario__lte=hora_atual).select_related("cidadao", "servico").order_by("horario"):
            atrasados.append({
                "id": str(agendamento.id),
                "horario": agendamento.horario.strftime("%H:%M"),
                "cidadao_nome": agendamento.cidadao.nome,
                "telefone": agendamento.cidadao.telefone,
                "servico_nome": agendamento.servico.nome,
                "atraso_min": round((agora - combinar_horario(hoje, agendamento.horario)).total_seconds() / 60),
            })

        incompletos = []
        vistos = set()
        for agendamento in do_dia.exclude(situacao__in=indicadores.SITUACOES_CANCELADAS).select_related("cidadao").order_by("horario"):
            cidadao = agendamento.cidadao
            faltando = cadastro_incompleto(cidadao)
            if faltando and cidadao.pk not in vistos:
                vistos.add(cidadao.pk)
                incompletos.append({
                    "cidadao_id": str(cidadao.pk), "cidadao_nome": cidadao.nome,
                    "horario": agendamento.horario.strftime("%H:%M"), "faltando": faltando,
                })

        vagas = vagas_livres(unidade, hoje, agora)
        return Response({"success": True, "results": {
            "data": hoje,
            "resumo": {
                "esperados": contagens["total"] - contagens["cancelados"],
                "chegaram": contagens["compareceram"],
                "atrasados": len(atrasados),
                "a_chegar": contagens["agendados"] - len(atrasados),
                "ausentes": contagens["ausentes"],
                "cancelados": contagens["cancelados"],
                "vagas_livres": sum(v["livres"] for v in vagas),
            },
            "atrasados": atrasados,
            "vagas_livres": vagas,
            "fila": fila_de_espera(unidade, agora),
            "cadastros_incompletos": incompletos,
        }})
