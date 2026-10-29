"""Painel "Meu Dia" do médico e do enfermeiro: só os próprios atendimentos, com a unidade como referência."""

from collections import Counter
from datetime import timedelta

from django.db.models import Count, Q
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from agendamentos.models import Agendamento
from app.static_data import GRUPO_ENFERMEIRO, GRUPO_MEDICO, GRUPOS_PROFISSIONAIS_SAUDE
from prontuario.models import Receita, ReceitaMedicamento, RegistroAtendimento
from . import indicadores
from .sla import combinar_horario, medir_atendimento

DIAS_HISTORICO = 30
LIMITE_AGENDA = 100

# Limites usados para contar sinais vitais alterados na triagem.
PA_SISTOLICA_ALTA = 140
PA_DIASTOLICA_ALTA = 90
GLICEMIA_ALTA = 200
TEMPERATURA_FEBRE = 37.8


def grupos_do_usuario(user):
    return set(user.groups.values_list("name", flat=True))


class ProfissionalSaudePermission(permissions.BasePermission):
    message = "O painel Meu Dia é exclusivo de médicos e enfermeiros."

    def has_permission(self, request, view):
        user = request.user
        return bool(user and user.is_authenticated and grupos_do_usuario(user) & set(GRUPOS_PROFISSIONAIS_SAUDE))


class MeuDiaParams(serializers.Serializer):
    unidade_id = serializers.UUIDField()
    data = serializers.DateField(default=timezone.localdate)


def resumo_tempos(queryset):
    grupos = indicadores.tempos_por(queryset, "unidade_id")
    total = indicadores.Tempos()
    for tempos in grupos.values():
        total.juntar(tempos)
    return total.resumo()


def minutos_desde(instante, agora):
    return max(round((agora - instante).total_seconds() / 60), 0)


def item_agenda(agendamento, agora, hoje):
    _, _, duracao, _, _ = medir_atendimento(agendamento)
    marcado = combinar_horario(agendamento.data, agendamento.horario)
    aguardando = agendamento.situacao in indicadores.SITUACOES_AGUARDANDO
    return {
        "id": str(agendamento.id),
        "horario": agendamento.horario.strftime("%H:%M"),
        "cidadao_nome": agendamento.cidadao.nome,
        "servico_nome": agendamento.servico.nome,
        "situacao": agendamento.situacao,
        "situacao_nome": agendamento.get_situacao_display(),
        "duracao_min": duracao,
        "meta_min": indicadores.meta_do_servico(agendamento.servico.tipo_servico.tempo_atendimento),
        # Sem hora de chegada registrada, a espera conta a partir do horário marcado.
        "espera_min": minutos_desde(marcado, agora) if aguardando and hoje else None,
    }


def prescricoes(user, inicio, fim):
    receitas = Receita.objects.filter(
        profissional=user, is_active=True, data_emissao__date__range=(inicio, fim),
    ).aggregate(total=Count("id"), retirada_imediata=Count("id", filter=Q(agendamento__retirar_medicamento=True)))
    itens = ReceitaMedicamento.objects.filter(
        is_active=True, receita__is_active=True, receita__profissional=user,
        receita__data_emissao__date__range=(inicio, fim),
    ).values(
        "medicamento__nome", "medicamento__concentracao", "medicamento__unidade_medida", "nome",
    ).annotate(receitas=Count("receita_id", distinct=True))
    medicamentos = Counter()
    for item in itens:
        # Itens antigos sem vínculo com o catálogo usam o nome digitado na receita.
        unidade = (item["medicamento__unidade_medida"] or "").lower()
        nome = " ".join(filter(None, [item["medicamento__nome"], item["medicamento__concentracao"], unidade])) or item["nome"]
        medicamentos[nome or "Sem nome"] += item["receitas"]
    return {
        "receitas_total": receitas["total"],
        "receitas_retirada_imediata": receitas["retirada_imediata"],
        "medicamentos": [{"nome": nome, "receitas": total} for nome, total in medicamentos.most_common(10)],
    }


def cids(registros):
    linhas = registros.exclude(cid__isnull=True).exclude(cid="").values("cid").annotate(total=Count("id"))
    return [{"cid": row["cid"], "total": row["total"]} for row in linhas.order_by("-total", "cid")[:10]]


def triagem(registros):
    com_sinais = Q(pressao_sistolica__isnull=False) | Q(glicemia_capilar__isnull=False) | Q(temperatura__isnull=False)
    return registros.aggregate(
        registros_com_sinais=Count("id", filter=com_sinais),
        pressao_elevada=Count("id", filter=Q(pressao_sistolica__gte=PA_SISTOLICA_ALTA) | Q(pressao_diastolica__gte=PA_DIASTOLICA_ALTA)),
        glicemia_alta=Count("id", filter=Q(glicemia_capilar__gte=GLICEMIA_ALTA)),
        febre=Count("id", filter=Q(temperatura__gte=TEMPERATURA_FEBRE)),
    )


class MeuDiaAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated, ProfissionalSaudePermission]

    def get(self, request):
        params = MeuDiaParams(data=request.query_params)
        params.is_valid(raise_exception=True)
        unidade_id, dia = params.validated_data["unidade_id"], params.validated_data["data"]
        user = request.user
        if not user.unidades_lotacao.filter(pk=unidade_id).exists():
            raise PermissionDenied("Você não está lotado nesta unidade.")

        agora = timezone.now()
        hoje = dia == timezone.localdate()
        do_dia = Agendamento.objects.filter(unidade_id=unidade_id, data=dia)
        # A mesma regra da lista de atendimentos: os serviços que o profissional oferece, ainda sem atendente, e os dele.
        tipos = user.tipo_ofertados.values_list("id", flat=True)
        agenda = do_dia.filter(Q(atendente=user) | Q(atendente__isnull=True, servico__tipo_servico_id__in=tipos))
        contagens = indicadores.contar(agenda)
        itens = [
            item_agenda(ag, agora, hoje)
            for ag in agenda.select_related("cidadao", "servico__tipo_servico").order_by("horario", "id")[:LIMITE_AGENDA]
        ]
        esperas = [item["espera_min"] for item in itens if item["espera_min"] is not None]

        inicio = dia - timedelta(days=DIAS_HISTORICO - 1)
        meus = Agendamento.objects.filter(atendente=user, unidade_id=unidade_id)
        historico = indicadores.tempos_por(meus.filter(data__range=(inicio, dia)), "data")
        serie = []
        for offset in range(DIAS_HISTORICO):
            data = inicio + timedelta(days=offset)
            resumo = historico[data].resumo() if data in historico else indicadores.Tempos().resumo()
            serie.append({
                "data": data.isoformat(),
                "consultas": resumo["encerrados"],
                "tempo_medio_atendimento_min": resumo["tempo_medio_atendimento_min"] if resumo["medidos"] else None,
                "tempo_medio_esperado_min": resumo["tempo_medio_esperado_min"] if resumo["medidos"] else None,
                "pct_dentro_meta": resumo["pct_dentro_meta"],
            })

        registros = RegistroAtendimento.objects.filter(
            profissional=user, unidade_id=unidade_id, agendamento__data__range=(inicio, dia),
        )
        riscos = dict(
            registros.exclude(classificacao_risco__isnull=True).exclude(classificacao_risco="")
            .values("classificacao_risco").annotate(total=Count("id")).values_list("classificacao_risco", "total")
        )
        grupos = grupos_do_usuario(user)
        return Response({"success": True, "results": {
            "data": dia,
            "historico_inicio": inicio,
            "perfil": "medico" if GRUPO_MEDICO in grupos else "enfermeiro",
            "resumo": {
                "agendados": contagens["total"] - contagens["cancelados"],
                "a_chegar": contagens["agendados"],
                "aguardando": contagens["aguardando"],
                "em_atendimento": contagens["em_atendimento"],
                "atendidos": contagens["encerrados"],
                "ausentes": contagens["ausentes"],
                "cancelados": contagens["cancelados"],
                "maior_espera_min": max(esperas, default=None),
            },
            "meus_tempos": resumo_tempos(meus.filter(data=dia)),
            "tempos_unidade": resumo_tempos(do_dia),
            "agenda": itens,
            "serie": serie,
            "classificacao_risco": [
                {"classificacao": codigo, "total": riscos.get(codigo, 0)}
                for codigo in ("VERMELHO", "LARANJA", "AMARELO", "VERDE", "AZUL")
            ],
            "prescricao": prescricoes(user, inicio, dia) if GRUPO_MEDICO in grupos else None,
            "cids": cids(registros) if GRUPO_MEDICO in grupos else None,
            "triagem": triagem(registros) if GRUPO_ENFERMEIRO in grupos else None,
        }})
