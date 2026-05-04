from datetime import datetime, timedelta, time
from django.utils.timezone import localdate
from django.db.models import Q

from usuarios.models import Usuario
from unidade_cras.models import ServicoUnidadeCras, BloqueioHorario
from agendamentos.models import AgendaVaga

MAPA_DIAS_NUM = {
    1: "DOM",
    2: "SEG",
    3: "TER",
    4: "QUA",
    5: "QUI",
    6: "SEX",
    7: "SAB",
}


# =========================================================
# 🔵 GERAR VAGAS POR TIPO DE SERVIÇO (TOTALMENTE COMPATÍVEL COM ORACLE)
# =========================================================
def gerar_grade_tipo(unidade, tipo_servico, data):

    dia_num = data.isoweekday() + 1
    if dia_num > 7:
        dia_num = 1

    dia_codigo = MAPA_DIAS_NUM[dia_num]

    # ============================================
    # BUSCA TODOS os serviços da unidade + tipo
    # (sem filtrar por JSONField no banco!)
    # ============================================
    su_queryset = ServicoUnidadeCras.objects.filter(
        is_active=True,
        unidade=unidade,
        servico__tipo_servico=tipo_servico
    )

    # ============================================
    # FILTRA EM PYTHON os que atendem no dia
    # ============================================
    servicos = [
        su for su in su_queryset
        if su.dias_semana and dia_codigo in su.dias_semana
    ]

    if not servicos:
        return []

    # ============================================
    # UNIR OS HORÁRIOS DE TODOS OS SERVIÇOS DO TIPO
    # ============================================
    inicio_manha = None
    fim_manha = None
    inicio_tarde = None
    fim_tarde = None

    for su in servicos:

        if su.mesmo_expediente:
            u = unidade
            inicio_manha = u.hora_manha_inicio
            fim_manha = u.hora_manha_fim
            inicio_tarde = u.hora_tarde_inicio
            fim_tarde = u.hora_tarde_fim

        else:
            # manhã
            if su.hora_manha_inicio and su.hora_manha_fim:
                if not inicio_manha or su.hora_manha_inicio < inicio_manha:
                    inicio_manha = su.hora_manha_inicio
                if not fim_manha or su.hora_manha_fim > fim_manha:
                    fim_manha = su.hora_manha_fim

            # tarde
            if su.hora_tarde_inicio and su.hora_tarde_fim:
                if not inicio_tarde or su.hora_tarde_inicio < inicio_tarde:
                    inicio_tarde = su.hora_tarde_inicio
                if not fim_tarde or su.hora_tarde_fim > fim_tarde:
                    fim_tarde = su.hora_tarde_fim

    if not any([inicio_manha, inicio_tarde]):
        return []

    # ==================================================
    # PROFISSIONAIS APTOS AO TIPO
    # ==================================================
    prof_queryset = Usuario.objects.filter(
        is_active=True,
        unidades_lotacao=unidade,
        tipo_ofertados=tipo_servico,
        escalas__unidade=unidade,
    ).distinct()

    # ============================================
    # FILTRAR ESCALAS NO PYTHON
    # ============================================
    profissionais = []

    for p in prof_queryset:
        escalas_p = p.escalas.filter(unidade=unidade)

        for esc in escalas_p:
            if esc.dias_semana and dia_codigo in esc.dias_semana:
                profissionais.append(p)
                break

    if not profissionais:
        return []

    # ==================================================
    # BLOQUEIOS
    # ==================================================
    bloqueios = BloqueioHorario.objects.filter(
        is_active=True,
        cras=unidade
    ).filter(
        Q(data=data, data_final__isnull=True) |
        Q(data__lte=data, data_final__gte=data)
    )

    def bloqueado(horario):
        for b in bloqueios:
            if b.hora_inicio <= horario < b.hora_fim:
                return True
        return False

    # ==================================================
    # GERAÇÃO DA GRADE
    # ==================================================
    duracao = tipo_servico.tempo_atendimento
    if not duracao:
        return []

    periodos = []
    if inicio_manha and fim_manha:
        periodos.append((inicio_manha, fim_manha))
    if inicio_tarde and fim_tarde:
        periodos.append((inicio_tarde, fim_tarde))

    grade_final = []

    for p in profissionais:

        escalas_p = p.escalas.filter(unidade=unidade)

        # turnos do profissional
        turnos = []
        for esc in escalas_p:
            if esc.turno1_inicio and esc.turno1_fim:
                turnos.append((esc.turno1_inicio, esc.turno1_fim))
            if esc.turno2_inicio and esc.turno2_fim:
                turnos.append((esc.turno2_inicio, esc.turno2_fim))

        for ini_s, fim_s in periodos:
            for ini_p, fim_p in turnos:

                inicio_real = max(ini_s, ini_p)
                fim_real = min(fim_s, fim_p)

                if inicio_real >= fim_real:
                    continue

                slot = datetime.combine(data, inicio_real)
                limite = datetime.combine(data, fim_real)

                while slot + timedelta(minutes=duracao) <= limite:
                    h = slot.time()
                    if not bloqueado(h):
                        grade_final.append({
                            "horario": h.strftime("%H:%M"),
                            "data": data,
                            "tipo": tipo_servico.nome,
                            "profissional": p.nome_completo,
                        })
                    slot += timedelta(minutes=duracao)

    return grade_final

def salvar_grade_tipo(unidade, tipo_servico, data):

    grade = gerar_grade_tipo(unidade, tipo_servico, data)

    vagas_agrupadas = {}
    for item in grade:
        h = item["horario"]
        vagas_agrupadas[h] = vagas_agrupadas.get(h, 0) + 1

    vagas_criadas = []

    for horario_str, qtd in vagas_agrupadas.items():

        horario = datetime.strptime(horario_str, "%H:%M").time()

        vaga, created = AgendaVaga.objects.get_or_create(
            unidade=unidade,
            tipo_servico=tipo_servico,
            data=data,
            horario=horario,
            defaults={"vagas": qtd}
        )

        if not created:
            vaga.vagas = qtd
            vaga.save()

        vagas_criadas.append(vaga)

    return vagas_criadas
