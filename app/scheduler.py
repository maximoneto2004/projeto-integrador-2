import logging
from functools import wraps
from datetime import timedelta
from zoneinfo import ZoneInfo

from apscheduler.schedulers.background import BackgroundScheduler
from django.conf import settings

logger = logging.getLogger(__name__)
_scheduler = None


def _with_db_connection_hygiene(job):
    @wraps(job)
    def _wrapped(*args, **kwargs):
        from django.db import close_old_connections, connections

        close_old_connections()
        try:
            return job(*args, **kwargs)
        finally:
            for conn in connections.all():
                conn.close_if_unusable_or_obsolete()
            close_old_connections()

    return _wrapped


def _get_timezone():
    try:
        return ZoneInfo(settings.TIME_ZONE)
    except Exception:
        return None


@_with_db_connection_hygiene
def _marcar_ausencia_job():
    from agendamentos.models import Agendamento

    try:
        total = Agendamento.marcar_vencidos_como_ausencia()
        logger.info("APScheduler: %s agendamentos marcados como AUSENCIA_CIDADAO", total)
    except Exception:
        logger.exception("APScheduler: falha ao marcar vencidos como AUSENCIA_CIDADAO")


@_with_db_connection_hygiene
def _gerar_vagas_job():
    """Job para gerar vagas para os próximos dias com base nos horários das unidades e tipos de serviço ativos.
        Agora o fluxo de busca é:
        1 - busca todas as unidades CRAS ativas, usando o Prefetch
        2 - busca todos os serviços e tipos de serviços vinculados a cada unidade, usando o related_name="servicos_unidade"
        3 - armazena tudo em memória e gera as vagas para os próximos dias, evitando consultas repetidas.
        4 - adiciona um pequeno delay entre as unidades para evitar sobrecarga do banco.
    """
    from datetime import timedelta
    from django.utils.timezone import localdate
    from unidade_cras.models import UnidadeCras, ServicoUnidadeCras
    from app.gerar_grade import salvar_grade_tipo
    import time
    from django.db.models import Prefetch

    try:
        hoje = localdate()
        datas = []
        offset = 1
        while len(datas) < 2:
            data = hoje + timedelta(days=offset)
            if data.weekday() < 5:
                datas.append(data)
            offset += 1
        total_vagas = 0

        unidades = UnidadeCras.objects.filter(is_active=True).prefetch_related(Prefetch(
            "servicos_unidade",
            queryset=ServicoUnidadeCras.objects.filter(is_active=True).select_related("servico__tipo_servico"),
            to_attr="servicos_ativos"))
        for unidade in unidades:
            tipos_vistos = set()
            for servico_unidade in unidade.servicos_ativos:
                tipo = servico_unidade.servico.tipo_servico
                if tipo and tipo.is_active and tipo.id not in tipos_vistos:
                    tipos_vistos.add(tipo.id)
                    for data in datas:
                        vagas = salvar_grade_tipo(unidade, tipo, data)
                        total_vagas += len(vagas)
            time.sleep(0.2)
            
        logger.info("APScheduler: %s vagas geradas (D+1, D+2)", total_vagas)
    except Exception:
        logger.exception("APScheduler: falha ao gerar vagas")


@_with_db_connection_hygiene
def _limpar_fila_espera_job():
    from fila_espera.models import FilaEspera
    from django.utils import timezone

    try:
        dia_anterior = timezone.localdate() - timedelta(days=1)
        total = FilaEspera.limpar_fila_do_dia(data=dia_anterior)
        logger.info("APScheduler: %s registros da fila de espera removidos", total)
    except Exception:
        logger.exception("APScheduler: falha ao limpar a fila de espera")


@_with_db_connection_hygiene
def _limpar_chamadas_painel_job():
    from agendamentos.models import ChamadaPainel
    from django.utils import timezone

    try:
        dia_anterior = timezone.localdate() - timedelta(days=1)
        total = ChamadaPainel.limpar_chamadas_do_dia(data=dia_anterior)
        logger.info("APScheduler: %s chamadas do painel removidas", total)
    except Exception:
        logger.exception("APScheduler: falha ao limpar chamadas do painel")


def start_scheduler():
    global _scheduler

    if _scheduler and _scheduler.running:
        return _scheduler

    tz = _get_timezone()
    _scheduler = BackgroundScheduler(timezone=tz)
    _scheduler.add_job(
        _marcar_ausencia_job,
        trigger="cron",
        hour=1,
        minute=0,
        id="marcar_vencidos_ausencia",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        _gerar_vagas_job,
        trigger="cron",
        hour=0,
        minute=10,
        id="gerar_vagas_d1_d2",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        _limpar_fila_espera_job,
        trigger="cron",
        hour=2,
        minute=00,
        id="limpar_fila_espera",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.add_job(
        _limpar_chamadas_painel_job,
        trigger="cron",
        hour=2,
        minute=5,
        id="limpar_chamadas_painel",
        replace_existing=True,
        max_instances=1,
        coalesce=True,
    )
    _scheduler.start()
    logger.info("APScheduler iniciado (job diário às 00:00).")
    return _scheduler
