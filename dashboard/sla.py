"""Medição da consulta clínica, independente do tempo posterior na farmácia."""

from datetime import datetime, timedelta

from django.db.models import Avg, Case, Count, DurationField, ExpressionWrapper, F, Q, When
from django.utils import timezone

from usuarios.models import Usuario


SITUACOES_ENCERRADAS = ("FINALIZADO", "AGUARDANDO_RETIRADA", "CHAMANDO_RETIRADA")


def medir_atendimento(atendimento):
    """Prefere datas completas; horários legados só medem intervalos válidos no mesmo dia."""
    inicio = atendimento.inicio_atendimento_em
    fim = atendimento.fim_atendimento_em
    inicio_legado = combinar_horario(atendimento.data, atendimento.data_hora_inicio_atendimento)
    fim_legado = combinar_horario(atendimento.data, atendimento.data_hora_fim_atendimento)
    historico = bool((not inicio and inicio_legado) or (not fim and fim_legado))
    if inicio and fim:
        duracao = (fim - inicio).total_seconds() / 60
    else:
        duracao = (fim_legado - inicio_legado).total_seconds() / 60 if inicio_legado and fim_legado else None
        inicio, fim = inicio or inicio_legado, fim or fim_legado
    encerrado = atendimento.situacao in SITUACOES_ENCERRADAS
    if duracao is not None and duracao < 0:
        return inicio, fim, None, historico, "Horário final anterior ao início."
    if not encerrado:
        return inicio, fim, None, historico, "Atendimento ainda não concluído."
    if duracao is None:
        return inicio, fim, None, historico, "Início ou término não registrado."
    return inicio, fim, round(duracao, 2), historico, None


def combinar_horario(data, horario):
    if horario is None:
        return None
    return timezone.make_aware(datetime.combine(data, horario))


def com_duracao(queryset):
    """Calcula no banco para que as médias não dependam da página de resultados."""
    datas_completas = Q(inicio_atendimento_em__isnull=False, fim_atendimento_em__isnull=False)
    return queryset.annotate(
        duracao_bruta=Case(
            When(datas_completas, then=ExpressionWrapper(
                F("fim_atendimento_em") - F("inicio_atendimento_em"), output_field=DurationField(),
            )),
            default=ExpressionWrapper(
                F("data_hora_fim_atendimento") - F("data_hora_inicio_atendimento"), output_field=DurationField(),
            ),
            output_field=DurationField(),
        ),
    ).annotate(
        duracao_sla=Case(
            When(situacao__in=SITUACOES_ENCERRADAS, duracao_bruta__gte=timedelta(0), then=F("duracao_bruta")),
            output_field=DurationField(),
        ),
    )


def minutos(duracao):
    return round(duracao.total_seconds() / 60, 2) if duracao is not None else None


def resumo_sla(queryset):
    """Média ponderada por consulta, incluindo consultas concluídas antes da dispensação."""
    encerrados = com_duracao(queryset.filter(situacao__in=SITUACOES_ENCERRADAS))
    total = encerrados.aggregate(total=Count("id"), medidos=Count("duracao_sla"), media=Avg("duracao_sla"))
    servicos = encerrados.values("servico_id", "servico__nome", "servico__tipo_servico__tempo_atendimento").annotate(
        total=Count("id"), medidos=Count("duracao_sla"), media=Avg("duracao_sla"),
    ).order_by("servico__nome", "servico_id")
    # O filtro por subconsulta evita multiplicar atendimentos de usuários com vários grupos.
    medicos = Usuario.objects.filter(Q(groups__name__iexact="Médico") | Q(groups__name__iexact="medico"))
    por_medico = encerrados.filter(atendente__in=medicos).values("atendente_id", "atendente__nome_completo").annotate(
        total=Count("id"), medidos=Count("duracao_sla"), media=Avg("duracao_sla"),
    ).order_by("atendente__nome_completo", "atendente_id")
    return {
        "media_min": minutos(total["media"]),
        "total_encerrados": total["total"],
        "total_medidos": total["medidos"],
        "sem_medicao": total["total"] - total["medidos"],
        "por_medico": [
            {"id": str(r["atendente_id"]), "nome": r["atendente__nome_completo"], "total": r["total"],
             "medidos": r["medidos"], "media_min": minutos(r["media"])} for r in por_medico
        ],
        "por_servico": [
            {"id": str(r["servico_id"]), "nome": r["servico__nome"], "total": r["total"],
             "medidos": r["medidos"], "media_min": minutos(r["media"]),
             "meta_min": r["servico__tipo_servico__tempo_atendimento"] or None} for r in servicos
        ],
    }
