"""Blocos estratégicos do Painel da Rede (Gestor): comparação, tendência, capacidade e público."""

from collections import Counter, defaultdict
from datetime import timedelta

from django.db.models import Count, Sum
from django.db.models.functions import TruncWeek

from agendamentos.models import AgendaVaga, Agendamento
from medicamentos.services import calcular_alertas
from . import indicadores

SEMANAS_SERIE = 12
SITUACOES_SEM_DEMANDA = (*indicadores.SITUACOES_CANCELADAS,)
SITUACOES_SEM_OCUPACAO = (*indicadores.SITUACOES_CANCELADAS, *indicadores.SITUACOES_AUSENCIA)
FAIXAS_ETARIAS = (
    ("0 a 11 anos", 0, 11), ("12 a 17 anos", 12, 17), ("18 a 29 anos", 18, 29),
    ("30 a 59 anos", 30, 59), ("60 a 79 anos", 60, 79), ("80 anos ou mais", 80, 200),
)


def ocupacao_pct(inicio, fim, agendamentos=None):
    """Vagas ocupadas sobre vagas abertas; encaixes da fila sem vaga também ocupam a agenda."""
    agendamentos = agendamentos if agendamentos is not None else Agendamento.objects.filter(data__range=(inicio, fim))
    vagas = AgendaVaga.objects.filter(data__range=(inicio, fim)).aggregate(total=Sum("vagas"), ocupadas=Sum("vagas_ocupadas"))
    encaixes = agendamentos.filter(origem="FILA", vaga__isnull=True).exclude(situacao__in=SITUACOES_SEM_OCUPACAO).count()
    if not vagas["total"]:
        return None
    return round(((vagas["ocupadas"] or 0) + encaixes) / vagas["total"] * 100, 2)


def kpis(inicio, fim):
    periodo = Agendamento.objects.filter(data__range=(inicio, fim))
    contagens = indicadores.contar(periodo)
    tempos = indicadores.Tempos()
    for grupo in indicadores.tempos_por(periodo, "unidade_id").values():
        tempos.juntar(grupo)
    resumo = tempos.resumo()
    return {
        "consultas": contagens["encerrados"],
        "agendamentos": contagens["total"],
        "absenteismo": contagens["taxa_absenteismo"],
        "pct_dentro_meta": resumo["pct_dentro_meta"],
        "tempo_medio_espera_min": resumo["tempo_medio_espera_min"] if resumo["encerrados"] else None,
        "tempo_medio_atendimento_min": resumo["tempo_medio_atendimento_min"] if resumo["medidos"] else None,
        "ocupacao": ocupacao_pct(inicio, fim, periodo),
    }


def comparativo(inicio, fim):
    """O mesmo número de dias imediatamente antes do período, para mostrar a tendência."""
    dias = (fim - inicio).days + 1
    anterior_fim = inicio - timedelta(days=1)
    anterior_inicio = anterior_fim - timedelta(days=dias - 1)
    return {
        "atual": kpis(inicio, fim),
        "anterior": kpis(anterior_inicio, anterior_fim),
        "anterior_inicio": anterior_inicio,
        "anterior_fim": anterior_fim,
    }


def serie_semanal(fim):
    """Doze semanas completas terminando na semana de `fim`, independentemente do filtro."""
    ultima = fim - timedelta(days=fim.weekday())
    primeira = ultima - timedelta(weeks=SEMANAS_SERIE - 1)
    periodo = Agendamento.objects.filter(data__range=(primeira, ultima + timedelta(days=6)))
    contagens = indicadores.contar_por(periodo.annotate(semana=TruncWeek("data")), "semana")
    tempos = defaultdict(indicadores.Tempos)
    for dia, grupo in indicadores.tempos_por(periodo, "data").items():
        tempos[dia - timedelta(days=dia.weekday())].juntar(grupo)
    serie = []
    for n in range(SEMANAS_SERIE):
        semana = primeira + timedelta(weeks=n)
        contagem = contagens.get(str(semana), {})
        resumo = tempos[semana].resumo() if semana in tempos else indicadores.Tempos().resumo()
        serie.append({
            "semana": semana.isoformat(),
            "consultas": contagem.get("encerrados", 0),
            "absenteismo": contagem.get("taxa_absenteismo", 0) if contagem else None,
            "pct_dentro_meta": resumo["pct_dentro_meta"],
        })
    return serie


def demanda_capacidade(inicio, fim):
    vagas = AgendaVaga.objects.filter(data__range=(inicio, fim)).values("tipo_servico_id", "tipo_servico__nome").annotate(
        vagas=Sum("vagas"),
    )
    demanda = dict(
        Agendamento.objects.filter(data__range=(inicio, fim)).exclude(situacao__in=SITUACOES_SEM_DEMANDA)
        .values("servico__tipo_servico_id").annotate(total=Count("id")).values_list("servico__tipo_servico_id", "total")
    )
    linhas = {
        row["tipo_servico_id"]: {"tipo_servico": row["tipo_servico__nome"] or "Sem tipo", "vagas": row["vagas"] or 0, "agendamentos": 0}
        for row in vagas
    }
    nomes = dict(Agendamento.objects.filter(servico__tipo_servico_id__in=set(demanda) - set(linhas)).values_list(
        "servico__tipo_servico_id", "servico__tipo_servico__nome",
    ).distinct())
    for tipo_id, total in demanda.items():
        linhas.setdefault(tipo_id, {"tipo_servico": nomes.get(tipo_id) or "Sem tipo", "vagas": 0, "agendamentos": 0})
        linhas[tipo_id]["agendamentos"] = total
    return sorted(linhas.values(), key=lambda l: (-(l["agendamentos"] - l["vagas"]), l["tipo_servico"]))


def idade(nascimento, referencia):
    return referencia.year - nascimento.year - ((referencia.month, referencia.day) < (nascimento.month, nascimento.day))


def faixa_etaria(inicio, fim):
    """Pacientes atendidos (consultas encerradas) por faixa de idade na data final do período."""
    nascimentos = Agendamento.objects.filter(
        data__range=(inicio, fim), situacao__in=indicadores.SITUACOES_ENCERRADAS,
    ).values_list("cidadao__data_nascimento", flat=True)
    contagem = Counter()
    for nascimento in nascimentos:
        if nascimento is None:
            contagem["Sem data de nascimento"] += 1
            continue
        anos = idade(nascimento, fim)
        contagem[next((rotulo for rotulo, menor, maior in FAIXAS_ETARIAS if menor <= anos <= maior), FAIXAS_ETARIAS[-1][0])] += 1
    faixas = [{"faixa": rotulo, "consultas": contagem[rotulo]} for rotulo, _, _ in FAIXAS_ETARIAS]
    if contagem["Sem data de nascimento"]:
        faixas.append({"faixa": "Sem data de nascimento", "consultas": contagem["Sem data de nascimento"]})
    return faixas


def rupturas_por_unidade():
    """Medicamentos abaixo do estoque mínimo agora; é uma foto do estoque, não depende do período."""
    por_unidade = Counter(str(linha["unidade_id"]) for linha in calcular_alertas(None)["estoque_baixo"])
    return {"total": sum(por_unidade.values()), "por_unidade": dict(por_unidade)}
