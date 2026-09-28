import re
from datetime import date
from agendamentos.models import AgendaVaga
from rest_framework import serializers
from agendamentos.models import Agendamento
from collections import defaultdict
from django.db.models import (
    Count,
    F,
    Avg,
    ExpressionWrapper,
    DurationField,
    FloatField,
    Q,
    Sum,
)
from django.db.models.functions import ExtractHour, Extract
from rest_framework import serializers
from django.db.models import Count, F, Avg, ExpressionWrapper, DurationField
from fila_espera.models import FilaEspera
from .metrics import calculate_pct_acima_esperado
from agendamentos.models import Agendamento


class DashboardSupervisorSerializer(serializers.Serializer):
    data_inicio = serializers.DateField()
    data_fim = serializers.DateField()
    unidade_id = serializers.CharField()

    total_agendamentos = serializers.SerializerMethodField()
    agendados = serializers.SerializerMethodField()
    em_atendimento = serializers.SerializerMethodField()
    aguardando_atendimento_ativado = serializers.SerializerMethodField()
    nao_compareceu = serializers.SerializerMethodField()
    cancelados = serializers.SerializerMethodField()
    aguardando_fila = serializers.SerializerMethodField()
    finalizados = serializers.SerializerMethodField()
    taxa_nao_comparecimento = serializers.SerializerMethodField()
    tempo_medio = serializers.SerializerMethodField()
    atendimentos_por_hora = serializers.SerializerMethodField()
    origem_atendimentos = serializers.SerializerMethodField()
    atendimentos_categoria = serializers.SerializerMethodField()
    agendamentos_por_classe = serializers.SerializerMethodField()
    servicos_metricas = serializers.SerializerMethodField()

    class Meta:
        fields = [
            "data_inicio",
            "data_fim",
            "unidade_id",
            "total_agendamentos",
            "agendados",
            "em_atendimento",
            "aguardando_atendimento_ativado",
            "nao_compareceu",
            "cancelados",
            "finalizados",
            "taxa_nao_comparecimento",
            "tempo_medio",
            "aguardando_fila",
            "atendimentos_por_hora",
            "origem_atendimentos",
            "atendimentos_categoria",
            "agendamentos_por_classe",
            "servicos_metricas",
        ]

    def _get_queryset(self):
        qs = self.context["queryset"]
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]
        unidade_id = self.validated_data["unidade_id"]
        return qs.filter(data__range=(start, end), unidade_id=unidade_id)

    def get_total_agendamentos(self, obj):
        return self._get_queryset().count()

    def get_agendados(self, obj):
        return self._get_queryset().filter(situacao="AGENDADO").count()

    def get_aguardando_fila(self, obj):
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]
        fila = FilaEspera.objects.filter(
            unidade__id=self.validated_data["unidade_id"],
            status="AGUARDANDO_FILA",
            created_at__date__range=(start, end),
        )
        return fila.count()

    def get_em_atendimento(self, obj):
        return self._get_queryset().filter(situacao="ATENDIMENTO").count()

    def get_aguardando_atendimento_ativado(self, obj):
        return self._get_queryset().filter(situacao__in=["ATIVADO", "CHAMANDO"]).count()

    def get_nao_compareceu(self, obj):
        return self._get_queryset().filter(situacao__in=["AUSENCIA_CIDADAO", "ATIVADO_AUSENTE"]).count()

    def get_cancelados(self, obj):
        return (
            self._get_queryset()
            .filter(situacao__in=["CANCELADO_CIDADAO", "CANCELADO_CRAS"])
            .count()
        )

    def get_finalizados(self, obj):
        return self._get_queryset().filter(situacao="FINALIZADO").count()

    def get_taxa_nao_comparecimento(self, obj):
        total = self.get_total_agendamentos(obj)
        nao = self.get_nao_compareceu(obj)
        return round((nao / total) * 100, 2) if total > 0 else 0

    def get_tempo_medio(self, obj):
        qs = self._get_queryset()

        duracao = (
            qs.filter(
                data_hora_inicio_atendimento__isnull=False,
                data_hora_fim_atendimento__isnull=False,
            )
            .annotate(
                duration=ExpressionWrapper(
                    F("data_hora_fim_atendimento") - F("data_hora_inicio_atendimento"),
                    output_field=DurationField(),
                )
            )
            .aggregate(media=Avg("duration"))["media"]
        )

        if not duracao:
            return 0

        return duracao.total_seconds() / 60

    def get_atendimentos_por_hora(self, obj):
        qs = self._get_queryset()
        return list(
            qs.filter(horario__isnull=False)
            .annotate(hour=ExtractHour("horario"))
            .values("hour")
            .annotate(total=Count("id"))
            .order_by("hour")
        )

    def get_origem_atendimentos(self, obj):
        return list(self._get_queryset().values("origem").annotate(total=Count("id")))

    def get_atendimentos_categoria(self, obj):
        return list(
            self._get_queryset()
            .values("servico__id", "servico__nome")
            .annotate(total=Count("id"))
            .order_by("-total")
        )

    def get_agendamentos_por_classe(self, obj):
        return list(
            self._get_queryset()
            .values("servico__classe__id", "servico__classe__nome")
            .annotate(total=Count("id"))
            .order_by("-total", "servico__classe__nome")
        )

    def get_servicos_metricas(self, obj):
        def minutes(t):
            if not t:
                return None
            return t.hour * 60 + t.minute + (t.second / 60)

        def diff_minutes(end, start):
            if not end or not start:
                return None
            return minutes(end) - minutes(start)

        qs = (
            self._get_queryset()
            .filter(unidade_id=self.validated_data["unidade_id"], situacao="FINALIZADO")
            .values(
                "servico__id",
                "servico__nome",
                "servico__tipo_servico__nome",
                "servico__tipo_servico__tempo_atendimento",
                "horario",
                "data_hora_inicio_atendimento",
                "data_hora_fim_atendimento",
            )
        )

        totais = defaultdict(int)
        somas_duracao = defaultdict(float)
        somas_espera = defaultdict(float)
        somas_excedente = defaultdict(float)
        cont_duracao = defaultdict(int)
        cont_espera = defaultdict(int)
        acima = defaultdict(int)
        meta = {}
        nome_servico = {}
        nome_tipo = {}

        for r in qs:
            servico_id = str(r.get("servico__id") or "")
            if not servico_id:
                continue

            totais[servico_id] += 1
            nome_servico[servico_id] = r.get("servico__nome") or ""
            nome_tipo[servico_id] = r.get("servico__tipo_servico__nome") or ""
            esperado = r.get("servico__tipo_servico__tempo_atendimento") or 20
            try:
                esperado = int(esperado)
            except (TypeError, ValueError):
                esperado = 20
            meta[servico_id] = esperado

            inicio = r.get("data_hora_inicio_atendimento")
            fim = r.get("data_hora_fim_atendimento")
            agendado = r.get("horario")

            dur = diff_minutes(fim, inicio)
            if dur is not None and dur >= 0:
                cont_duracao[servico_id] += 1
                somas_duracao[servico_id] += dur
                if dur > esperado:
                    acima[servico_id] += 1
                    somas_excedente[servico_id] += dur - esperado

            espera = diff_minutes(inicio, agendado)
            if espera is not None:
                if espera < 0:
                    espera = 0
                cont_espera[servico_id] += 1
                somas_espera[servico_id] += espera

        resultado = []
        for servico_id, total in sorted(totais.items(), key=lambda item: item[1], reverse=True):
            dcount = cont_duracao.get(servico_id, 0) or 0
            ecount = cont_espera.get(servico_id, 0) or 0
            esperado = meta.get(servico_id, 20)

            tempo_medio = (somas_duracao.get(servico_id, 0) / dcount) if dcount else 0
            espera_media = (somas_espera.get(servico_id, 0) / ecount) if ecount else 0
            excedente_medio = (somas_excedente.get(servico_id, 0) / dcount) if dcount else 0
            pct_acima = calculate_pct_acima_esperado(tempo_medio, esperado)

            resultado.append(
                {
                    "servico_id": servico_id,
                    "servico_nome": nome_servico.get(servico_id, ""),
                    "tipo_servico_nome": nome_tipo.get(servico_id, ""),
                    "esperado_min": esperado,
                    "total": total,
                    "tempo_medio_espera_min": round(espera_media, 2),
                    "tempo_medio_atendimento_min": round(tempo_medio, 2),
                    "tempo_excedente_medio_min": round(excedente_medio, 2),
                    "pct_acima_esperado": round(pct_acima, 2),
                }
            )

        return resultado



class DashboardGestorSerializer(serializers.Serializer):
    SITUACOES_EXCLUIR_OCUPACAO_FILA = [
        "CANCELADO_CIDADAO",
        "CANCELADO_CRAS",
        "AUSENCIA_CIDADAO",
        "ATIVADO_AUSENTE",
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
        if hasattr(self, "_stats"):
            return self._stats

        qs = self._get_queryset()

        self._stats = qs.aggregate(
            total_agendamentos=Count("id"),
            em_atendimento=Count("id", filter=Q(situacao="ATENDIMENTO")),
            aguardando_ativado=Count("id", filter=Q(situacao="ATIVADO")),
            ativado_ausente=Count("id", filter=Q(situacao="ATIVADO_AUSENTE")),
            nao_compareceu=Count("id", filter=Q(situacao="AUSENCIA_CIDADAO")),
            cancelados=Count(
                "id",
                filter=Q(situacao__in=["CANCELADO_CRAS", "CANCELADO_CIDADAO"]),
            ),
            duracao_media=Avg(
                ExpressionWrapper(
                    F("data_hora_fim_atendimento")
                    - F("data_hora_inicio_atendimento"),
                    output_field=DurationField(),
                )
            ),
        )

        return self._stats

    def get_total_agendamentos(self, obj):
        return self._get_stats()["total_agendamentos"]

    def get_em_atendimento(self, obj):
        return self._get_stats()["em_atendimento"]

    def get_aguardando_atendimento_ativado(self, obj):
        return self._get_stats()["aguardando_ativado"]

    def get_ativado_ausente(self, obj):
        return self._get_stats()["ativado_ausente"]

    def get_nao_compareceu(self, obj):
        return self._get_stats()["nao_compareceu"]

    def get_cancelados(self, obj):
        return self._get_stats()["cancelados"]

    def get_taxa_nao_comparecimento(self, obj):
        stats = self._get_stats()

        total = stats["total_agendamentos"]
        nao = stats["nao_compareceu"]

        return round((nao / total) * 100, 2) if total else 0

    def get_tempo_medio(self, obj):
        duracao = self._get_stats()["duracao_media"]

        if not duracao:
            return 0

        return round(duracao.total_seconds() / 60, 2)

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

        base = (
            qs.values(nome_unidade=F("unidade__nome"))
            .annotate(
                total_agendamentos=Count("id"),
                em_atendimento=Count("id", filter=Q(situacao="ATENDIMENTO")),
                ativados_ausentes=Count("id", filter=Q(situacao="ATIVADO_AUSENTE")),
                total_profissionais=Count("atendente", distinct=True),
                duracao_media_atendimento_min=Avg(
                    F("data_hora_fim_atendimento")
                    - F("data_hora_inicio_atendimento")
                ),
            )
            .order_by("-total_agendamentos")
        )

        vagas = (
            AgendaVaga.objects.filter(data__range=(start, end))
            .values(nome_unidade=F("unidade__nome"))
            .annotate(
                max_vagas=Sum("vagas"),
                vagas_ocupadas=Sum("vagas_ocupadas"),
            )
        )

        fila = (
            FilaEspera.objects.filter(
                status="AGUARDANDO_FILA",
                created_at__date__range=(start, end),
            )
            .values(nome_unidade=F("unidade__nome"))
            .annotate(fila_aguardando=Count("id"))
        )

        ocupacao_fila_sem_vaga = (
            qs.filter(origem="FILA", vaga__isnull=True)
            .exclude(situacao__in=self.SITUACOES_EXCLUIR_OCUPACAO_FILA)
            .values(nome_unidade=F("unidade__nome"))
            .annotate(total=Count("id"))
        )

        vagas_dict = {v["nome_unidade"]: v for v in vagas}
        fila_dict = {f["nome_unidade"]: f["fila_aguardando"] for f in fila}
        ocupacao_fila_dict = {
            item["nome_unidade"]: item["total"] for item in ocupacao_fila_sem_vaga
        }

        resultado = []

        for item in base:
            unidade_nome = item["nome_unidade"]
            duracao = item["duracao_media_atendimento_min"]

            minutos = duracao.total_seconds() / 60 if duracao else 0

            vagas_unidade = vagas_dict.get(unidade_nome, {})

            item["fila_aguardando"] = fila_dict.get(unidade_nome, 0)
            item["max_vagas"] = vagas_unidade.get("max_vagas", 0) or 0
            item["vagas_ocupadas"] = (
                (vagas_unidade.get("vagas_ocupadas", 0) or 0)
                + ocupacao_fila_dict.get(unidade_nome, 0)
            )
            item["duracao_media_atendimento_min"] = round(minutos, 2)

            resultado.append(item)

        return resultado


class DashboardMonitorUnidadeSerializer(serializers.Serializer):
    data_inicio = serializers.DateField()
    data_fim = serializers.DateField()
    unidade_id = serializers.CharField()
    total_agendamentos = serializers.SerializerMethodField()
    em_atendimento = serializers.SerializerMethodField()
    aguardando_atendimento_ativado = serializers.SerializerMethodField()
    aguardando_fila = serializers.SerializerMethodField()
    nao_compareceu = serializers.SerializerMethodField()
    cancelados = serializers.SerializerMethodField()
    taxa_nao_comparecimento = serializers.SerializerMethodField()
    tempo_medio = serializers.SerializerMethodField()
    finalizados = serializers.SerializerMethodField()
    atendimentos_por_hora = serializers.SerializerMethodField()
    atendimentos_categoria = serializers.SerializerMethodField()
    agendados = serializers.SerializerMethodField()
    servicos_metricas = serializers.SerializerMethodField()

    class Meta:
        fields = [
            "data_inicio",
            "data_fim",
            "unidade_id",
            "total_agendamentos",
            "em_atendimento",
            "aguardando_atendimento_ativado",
            "aguardando_fila",
            "nao_compareceu",
            "cancelados",
            "taxa_nao_comparecimento",
            "tempo_medio",
            "finalizados",
            "atendimentos_por_hora",
            "atendimentos_categoria",
            "agendados",
            "servicos_metricas",
        ]

    def _get_queryset(self):
        qs = self.context["queryset"]
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]
        unidade = self.validated_data["unidade_id"]
        return qs.filter(data__range=(start, end), unidade_id=unidade)
    
    def get_em_atendimento(self, obj):
        return self._get_queryset().filter(situacao="ATENDIMENTO").count()
    
    def get_total_agendamentos(self, obj):
        return self._get_queryset().count()
    
    def get_aguardando_atendimento_ativado(self, obj):
        return self._get_queryset().filter(situacao__in=["ATIVADO", "CHAMANDO"]).count()

    def get_aguardando_fila(self, obj):
        start = self.validated_data["data_inicio"]
        end = self.validated_data["data_fim"]
        fila = FilaEspera.objects.filter(
            unidade__id=self.validated_data["unidade_id"],
            status="AGUARDANDO_FILA",
            created_at__date__range=(start, end),
        )
        return fila.count()
    
    def get_cancelados(self, obj):
        cancelados = ["CANCELADO_CRAS", "CANCELADO_CIDADAO"]
        return self._get_queryset().filter(situacao__in=cancelados).count()
    
    def get_finalizados(self,obj):
        return self._get_queryset().filter(situacao="FINALIZADO").count()
    
    def get_agendados(self,obj):
        return self._get_queryset().filter(situacao="AGENDADO").count()
    
    
    def get_nao_compareceu(self, obj):
        return self._get_queryset().filter(situacao__in=["AUSENCIA_CIDADAO", "ATIVADO_AUSENTE"]).count()
    
    def get_taxa_nao_comparecimento(self, obj):
          total = self.get_total_agendamentos(obj)
          nao = self.get_nao_compareceu(obj)
          return round((nao / total) * 100, 2) if total > 0 else 0

    def get_tempo_medio(self, obj):
        qs = self._get_queryset()
        duracao = (
            qs.filter(
                data_hora_inicio_atendimento__isnull=False,
                data_hora_fim_atendimento__isnull=False,
            ).
            annotate(
                duration=ExpressionWrapper(
                    F("data_hora_fim_atendimento") - F("data_hora_inicio_atendimento"),
                    output_field=DurationField(),
                )
            )
            .aggregate(media=Avg("duration"))["media"]
        )
        if not duracao:
            return 0
        return duracao.total_seconds() / 60
    
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
        def minutes(t):
            if not t:
                return None
            return t.hour * 60 + t.minute + (t.second / 60)

        def diff_minutes(end, start):
            if not end or not start:
                return None
            return minutes(end) - minutes(start)

        qs = (
            self._get_queryset()
            .filter(situacao="FINALIZADO")
            .values(
                "servico__id",
                "servico__nome",
                "servico__tipo_servico__nome",
                "servico__tipo_servico__tempo_atendimento",
                "horario",
                "data_hora_inicio_atendimento",
                "data_hora_fim_atendimento",
            )
        )

        totais = defaultdict(int)
        somas_duracao = defaultdict(float)
        somas_espera = defaultdict(float)
        somas_excedente = defaultdict(float)
        cont_duracao = defaultdict(int)
        cont_espera = defaultdict(int)
        acima = defaultdict(int)
        meta = {}
        nome_servico = {}
        nome_tipo = {}

        for r in qs:
            servico_id = str(r.get("servico__id") or "")
            if not servico_id:
                continue

            totais[servico_id] += 1
            nome_servico[servico_id] = r.get("servico__nome") or ""
            nome_tipo[servico_id] = r.get("servico__tipo_servico__nome") or ""
            esperado = r.get("servico__tipo_servico__tempo_atendimento") or 20
            try:
                esperado = int(esperado)
            except (TypeError, ValueError):
                esperado = 20
            meta[servico_id] = esperado

            inicio = r.get("data_hora_inicio_atendimento")
            fim = r.get("data_hora_fim_atendimento")
            agendado = r.get("horario")

            dur = diff_minutes(fim, inicio)
            if dur is not None and dur >= 0:
                cont_duracao[servico_id] += 1
                somas_duracao[servico_id] += dur
                if dur > esperado:
                    acima[servico_id] += 1
                    somas_excedente[servico_id] += dur - esperado

            espera = diff_minutes(inicio, agendado)
            if espera is not None:
                if espera < 0:
                    espera = 0
                cont_espera[servico_id] += 1
                somas_espera[servico_id] += espera

        resultado = []
        for servico_id, total in sorted(totais.items(), key=lambda item: item[1], reverse=True):
            dcount = cont_duracao.get(servico_id, 0) or 0
            ecount = cont_espera.get(servico_id, 0) or 0
            esperado = meta.get(servico_id, 20)

            tempo_medio = (somas_duracao.get(servico_id, 0) / dcount) if dcount else 0
            espera_media = (somas_espera.get(servico_id, 0) / ecount) if ecount else 0
            excedente_medio = (somas_excedente.get(servico_id, 0) / dcount) if dcount else 0
            pct_acima = calculate_pct_acima_esperado(tempo_medio, esperado)

            resultado.append(
                {
                    "servico_id": servico_id,
                    "servico_nome": nome_servico.get(servico_id, ""),
                    "tipo_servico_nome": nome_tipo.get(servico_id, ""),
                    "esperado_min": esperado,
                    "total": total,
                    "tempo_medio_espera_min": round(espera_media, 2),
                    "tempo_medio_atendimento_min": round(tempo_medio, 2),
                    "tempo_excedente_medio_min": round(excedente_medio, 2),
                    "pct_acima_esperado": round(pct_acima, 2),
                }
            )

        return resultado
