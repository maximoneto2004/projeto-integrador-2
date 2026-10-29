from django.db.models import Count, F, Sum
from django.db.models.functions import ExtractHour
from rest_framework import serializers

from agendamentos.models import AgendaVaga
from fila_espera.models import FilaEspera
from . import indicadores
from .sla import resumo_sla


class IndicadoresUnidadeSerializer(serializers.Serializer):
    """Indicadores comuns ao Dashboard do Supervisor e ao Monitor da Unidade."""

    data_inicio = serializers.DateField()
    data_fim = serializers.DateField()

    total_agendamentos = serializers.SerializerMethodField()
    agendados = serializers.SerializerMethodField()
    em_atendimento = serializers.SerializerMethodField()
    aguardando_atendimento_ativado = serializers.SerializerMethodField()
    nao_compareceu = serializers.SerializerMethodField()
    cancelados = serializers.SerializerMethodField()
    aguardando_fila = serializers.SerializerMethodField()
    finalizados = serializers.SerializerMethodField()
    em_retirada = serializers.SerializerMethodField()
    taxa_nao_comparecimento = serializers.SerializerMethodField()
    tempo_medio = serializers.SerializerMethodField()
    atendimentos_por_hora = serializers.SerializerMethodField()
    atendimentos_categoria = serializers.SerializerMethodField()
    servicos_metricas = serializers.SerializerMethodField()

    def _get_queryset(self):
        qs = self.context["queryset"]
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]
        unidade_id = self.validated_data["unidade_id"]
        return qs.filter(data__range=(start, end), unidade_id=unidade_id)

    def _contagens(self):
        if not hasattr(self, "_cache_contagens"):
            self._cache_contagens = indicadores.contar(self._get_queryset())
        return self._cache_contagens

    def get_total_agendamentos(self, obj):
        return self._contagens()["total"]

    def get_agendados(self, obj):
        return self._contagens()["agendados"]

    def get_em_atendimento(self, obj):
        return self._contagens()["em_atendimento"]

    def get_aguardando_atendimento_ativado(self, obj):
        return self._contagens()["aguardando"]

    def get_nao_compareceu(self, obj):
        return self._contagens()["ausentes"]

    def get_cancelados(self, obj):
        return self._contagens()["cancelados"]

    def get_finalizados(self, obj):
        return self._contagens()["finalizados"]

    def get_em_retirada(self, obj):
        return self._contagens()["em_retirada"]

    def get_taxa_nao_comparecimento(self, obj):
        return self._contagens()["taxa_absenteismo"]

    def get_aguardando_fila(self, obj):
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]
        return FilaEspera.objects.filter(
            unidade__id=self.validated_data["unidade_id"],
            status="AGUARDANDO_FILA",
            created_at__date__range=(start, end),
        ).count()

    def get_tempo_medio(self, obj):
        return indicadores.tma_min(self._get_queryset()) or 0

    def get_atendimentos_por_hora(self, obj):
        return list(
            self._get_queryset()
            .filter(horario__isnull=False)
            .annotate(hour=ExtractHour("horario"))
            .values("hour")
            .annotate(total=Count("id"))
            .order_by("hour")
        )

    def get_atendimentos_categoria(self, obj):
        return list(
            self._get_queryset()
            .values("servico__id", "servico__nome")
            .annotate(total=Count("id"))
            .order_by("-total")
        )

    def get_servicos_metricas(self, obj):
        return indicadores.metricas_por_servico(self._get_queryset())


class DashboardSupervisorSerializer(IndicadoresUnidadeSerializer):
    unidade_id = serializers.UUIDField()

    origem_atendimentos = serializers.SerializerMethodField()
    agendamentos_por_classe = serializers.SerializerMethodField()
    sla = serializers.SerializerMethodField()

    def get_sla(self, obj):
        if not hasattr(self, "_sla"):
            self._sla = resumo_sla(self._get_queryset())
        return self._sla

    def get_tempo_medio(self, obj):
        return self.get_sla(obj)["media_min"] or 0

    def get_origem_atendimentos(self, obj):
        return list(self._get_queryset().values("origem").annotate(total=Count("id")).order_by())

    def get_agendamentos_por_classe(self, obj):
        return list(
            self._get_queryset()
            .values("servico__classe__id", "servico__classe__nome")
            .annotate(total=Count("id"))
            .order_by("-total", "servico__classe__nome")
        )


class DashboardMonitorUnidadeSerializer(IndicadoresUnidadeSerializer):
    unidade_id = serializers.CharField()


class DashboardGestorSerializer(serializers.Serializer):
    SITUACOES_EXCLUIR_OCUPACAO_FILA = [
        *indicadores.SITUACOES_CANCELADAS,
        *indicadores.SITUACOES_AUSENCIA,
    ]

    data_inicio = serializers.DateField()
    data_fim = serializers.DateField()
    total_agendamentos = serializers.SerializerMethodField()
    em_atendimento = serializers.SerializerMethodField()
    aguardando_atendimento_ativado = serializers.SerializerMethodField()
    ativado_ausente = serializers.SerializerMethodField()
    nao_compareceu = serializers.SerializerMethodField()
    cancelados = serializers.SerializerMethodField()
    taxa_nao_comparecimento = serializers.SerializerMethodField()
    ocupacao_media = serializers.SerializerMethodField()
    pessoas_prioridades = serializers.SerializerMethodField()
    tempo_medio = serializers.SerializerMethodField()
    informacoes_unidade = serializers.SerializerMethodField()

    def _get_queryset(self):
        qs = self.context["queryset"]
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]

        return qs.filter(data__range=(start, end))

    def _get_stats(self):
        if not hasattr(self, "_stats"):
            self._stats = indicadores.contar(self._get_queryset())
        return self._stats

    def get_total_agendamentos(self, obj):
        return self._get_stats()["total"]

    def get_em_atendimento(self, obj):
        return self._get_stats()["em_atendimento"]

    def get_aguardando_atendimento_ativado(self, obj):
        return self._get_stats()["aguardando"]

    def get_ativado_ausente(self, obj):
        return self._get_stats()["ativado_ausente"]

    def get_nao_compareceu(self, obj):
        return self._get_stats()["ausentes"]

    def get_cancelados(self, obj):
        return self._get_stats()["cancelados"]

    def get_taxa_nao_comparecimento(self, obj):
        return self._get_stats()["taxa_absenteismo"]

    def get_tempo_medio(self, obj):
        return indicadores.tma_min(self._get_queryset()) or 0

    def get_ocupacao_media(self, obj):
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]

        dados = AgendaVaga.objects.filter(data__range=(start, end)).aggregate(
            total_vagas=Sum("vagas"),
            total_ocupadas=Sum("vagas_ocupadas"),
        )

        ocupacao_fila_sem_vaga = (
            self._get_queryset()
            .filter(origem="FILA", vaga__isnull=True)
            .exclude(situacao__in=self.SITUACOES_EXCLUIR_OCUPACAO_FILA)
            .count()
        )

        total_vagas = dados["total_vagas"] or 0
        vagas_ocupadas = (dados["total_ocupadas"] or 0) + ocupacao_fila_sem_vaga

        if not total_vagas:
            return 0

        return round((vagas_ocupadas / total_vagas) * 100, 2)

    def get_pessoas_prioridades(self, obj):
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]

        qs = FilaEspera.objects.filter(
            created_at__date__range=(start, end),
            status="AGUARDANDO_FILA",
            prioridade__in=["PREFERENCIAL", "PREFERENCIAL+"],
        )

        return qs.values("prioridade").annotate(
            unidade_name=F("unidade__nome"),
            total=Count("id"),
        )

    def get_informacoes_unidade(self, obj):
        qs = self._get_queryset()
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]

        # Agrupa pelo id: unidades com o mesmo nome não podem se fundir.
        contagens = indicadores.contar_por(qs, "unidade_id")
        nomes = dict(qs.values_list("unidade_id", "unidade__nome").order_by().distinct())
        profissionais = dict(
            qs.values("unidade_id").annotate(total=Count("atendente", distinct=True)).values_list("unidade_id", "total")
        )
        tempos = indicadores.tempos_por(qs, "unidade_id")
        vagas = {
            row["unidade_id"]: row
            for row in AgendaVaga.objects.filter(data__range=(start, end))
            .values("unidade_id").annotate(max_vagas=Sum("vagas"), vagas_ocupadas=Sum("vagas_ocupadas"))
        }
        fila = dict(
            FilaEspera.objects.filter(status="AGUARDANDO_FILA", created_at__date__range=(start, end))
            .values("unidade_id").annotate(total=Count("id")).values_list("unidade_id", "total")
        )
        ocupacao_fila = dict(
            qs.filter(origem="FILA", vaga__isnull=True)
            .exclude(situacao__in=self.SITUACOES_EXCLUIR_OCUPACAO_FILA)
            .values("unidade_id").annotate(total=Count("id")).values_list("unidade_id", "total")
        )

        resultado = []
        for unidade_id, nome in nomes.items():
            contagem = contagens[str(unidade_id)]
            vagas_unidade = vagas.get(unidade_id, {})
            resumo_tempos = (tempos[unidade_id] if unidade_id in tempos else indicadores.Tempos()).resumo()
            resultado.append({
                "unidade_id": str(unidade_id),
                "nome_unidade": nome,
                "total_agendamentos": contagem["total"],
                "em_atendimento": contagem["em_atendimento"],
                "ativados_ausentes": contagem["ativado_ausente"],
                "nao_compareceu": contagem["ausentes"],
                "taxa_nao_comparecimento": contagem["taxa_absenteismo"],
                "total_profissionais": profissionais.get(unidade_id, 0),
                "duracao_media_atendimento_min": resumo_tempos["tempo_medio_atendimento_min"],
                "tempo_medio_espera_min": resumo_tempos["tempo_medio_espera_min"],
                "pct_dentro_meta": resumo_tempos["pct_dentro_meta"],
                "fila_aguardando": fila.get(unidade_id, 0),
                "max_vagas": vagas_unidade.get("max_vagas") or 0,
                "vagas_ocupadas": (vagas_unidade.get("vagas_ocupadas") or 0) + ocupacao_fila.get(unidade_id, 0),
            })

        return sorted(resultado, key=lambda item: (-item["total_agendamentos"], item["nome_unidade"]))
