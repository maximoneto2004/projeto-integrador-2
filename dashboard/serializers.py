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
from prontuario.models import (
    AcolhimentoFamiliar,
    AcompanhamentoCreas,
    AnotacaoPlanejamento,
    BeneficiosEventuais,
    CondicaoHabitacional,
    CondicaoEducacionalMembro,
    CondicoesDeSaude,
    ConvivenciaFamiliar,
    ConvivenviaFortalecimento,
    DescumprimentoCondicionalidadesBolsa,
    DescumprimentoEducacional,
    MembroComposicao,
    PessoaReferencia,
    Prontuario,
    AvaliacaoAcompanhamentoFamiliar,
    NovoIngresso,
    RegistroDesligamento,
    SaudeCuidadosMembro,
    SituacaoViolencia,
    TrabalhoRendimento,
    TrabalhoRendimentoMembro,
    TransferenciaRenda,
)
from agendamentos.models import Agendamento
from encaminhamentos.models import Encaminhamento


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


class PerfilFamiliarSerializer(serializers.Serializer):
    cpf = serializers.CharField()

    encontrado = serializers.SerializerMethodField()
    numero = serializers.SerializerMethodField()
    unidade = serializers.SerializerMethodField()
    pessoaReferenciaId = serializers.SerializerMethodField()
    dataAbertura = serializers.SerializerMethodField()
    versao = serializers.SerializerMethodField()

    membros = serializers.SerializerMethodField()
    condicoesHabitacionais = serializers.SerializerMethodField()
    condicoesEducacionais = serializers.SerializerMethodField()
    condicoesTrabalho = serializers.SerializerMethodField()
    rendaTotal = serializers.SerializerMethodField()
    rendaPerCapita = serializers.SerializerMethodField()
    condicoesSaude = serializers.SerializerMethodField()
    condicoesSaudeObservacoes = serializers.SerializerMethodField()
    beneficiosEventuais = serializers.SerializerMethodField()
    transferenciasRenda = serializers.SerializerMethodField()
    participacoesServicos = serializers.SerializerMethodField()
    acessoBeneficiosServicos = serializers.SerializerMethodField()
    convivenciaFamiliar = serializers.SerializerMethodField()
    avaliacaoAcompanhamento = serializers.SerializerMethodField()
    ciclosAcompanhamento = serializers.SerializerMethodField()
    situacoesViolencia = serializers.SerializerMethodField()
    medidasSocioeducativas = serializers.SerializerMethodField()
    acolhimentos = serializers.SerializerMethodField()
    evolucoes = serializers.SerializerMethodField()
    servicosAtendimento = serializers.SerializerMethodField()
    encaminhamentos = serializers.SerializerMethodField()
    descumprimentosCondicionalidades = serializers.SerializerMethodField()

    class Meta:
        fields = [
            "cpf",
            "encontrado",
            "numero",
            "unidade",
            "pessoaReferenciaId",
            "dataAbertura",
            "versao",
            "membros",
            "condicoesHabitacionais",
            "condicoesEducacionais",
            "condicoesTrabalho",
            "rendaTotal",
            "rendaPerCapita",
            "condicoesSaude",
            "condicoesSaudeObservacoes",
            "beneficiosEventuais",
            "transferenciasRenda",
            "participacoesServicos",
            "acessoBeneficiosServicos",
            "convivenciaFamiliar",
            "avaliacaoAcompanhamento",
            "ciclosAcompanhamento",
            "situacoesViolencia",
            "medidasSocioeducativas",
            "acolhimentos",
            "evolucoes",
            "servicosAtendimento",
            "encaminhamentos",
            "descumprimentosCondicionalidades",
        ]

    def _normalize_cpf(self):
        return re.sub(r"\D", "", self.validated_data.get("cpf", ""))

    def _display(self, obj, field_name):
        getter = getattr(obj, f"get_{field_name}_display", None)
        if callable(getter):
            return getter()
        return getattr(obj, field_name, None)

    def _iso_date(self, value):
        if not value:
            return ""
        if hasattr(value, "isoformat"):
            return value.isoformat()
        return str(value)

    def _build_context(self):
        if hasattr(self, "_perfil_context"):
            return self._perfil_context

        cpf = self._normalize_cpf()
        prontuario = None

        membro = (
            MembroComposicao.objects.select_related("prontuario", "prontuario__unidade_inicial")
            .filter(cidadao__cpf=cpf, ativo=True)
            .order_by("-responsavel", "created_at")
            .first()
        )
        if membro:
            prontuario = membro.prontuario

        if prontuario is None:
            pessoa_ref = (
                PessoaReferencia.objects.select_related(
                    "prontuario",
                    "prontuario__unidade_inicial",
                )
                .filter(pessoa_referencia__cpf=cpf)
                .first()
            )
            if pessoa_ref:
                prontuario = pessoa_ref.prontuario

        if prontuario is None:
            self._perfil_context = {"prontuario": None}
            return self._perfil_context

        prontuario = (
            Prontuario.objects.select_related("unidade_inicial")
            .only("id", "numero", "created_at", "unidade_inicial__nome")
            .get(id=prontuario.id)
        )
        prontuario_id = prontuario.id

        pessoa_referencia = (
            PessoaReferencia.objects.select_related("pessoa_referencia", "bairro")
            .prefetch_related("beneficio")
            .filter(prontuario_id=prontuario_id)
            .first()
        )

        membros = list(
            MembroComposicao.objects.select_related("cidadao")
            .filter(prontuario_id=prontuario_id, ativo=True)
            .order_by("-responsavel", "created_at")
        )
        condicoes_habitacionais = list(
            CondicaoHabitacional.objects.filter(prontuario_id=prontuario_id).order_by("created_at")
        )
        condicoes_educacionais = list(
            CondicaoEducacionalMembro.objects.select_related("membro")
            .filter(prontuario_id=prontuario_id)
            .order_by("created_at")
        )
        condicoes_trabalho = list(
            TrabalhoRendimentoMembro.objects.select_related("membro__cidadao")
            .filter(prontuario_id=prontuario_id)
            .order_by("created_at")
        )
        trabalho_rendimento_consolidado = (
            TrabalhoRendimento.objects.only("id", "renda_total", "renda_per_capita")
            .filter(prontuario_id=prontuario_id)
            .first()
        )
        condicoes_saude = list(
            SaudeCuidadosMembro.objects.select_related("membro")
            .filter(prontuario_id=prontuario_id)
            .order_by("created_at")
        )
        beneficios_eventuais = list(
            BeneficiosEventuais.objects.filter(prontuario_id=prontuario_id).order_by("created_at")
        )
        transferencias_renda = list(
            TransferenciaRenda.objects.select_related("beneficio")
            .filter(prontuario_id=prontuario_id)
            .order_by("created_at")
        )
        participacoes_servicos = list(
            ConvivenviaFortalecimento.objects.select_related("membro")
            .filter(prontuario_id=prontuario_id)
            .order_by("created_at")
        )
        convivencia_familiar = (
            ConvivenciaFamiliar.objects.filter(prontuario_id=prontuario_id).order_by("-created_at").first()
        )
        avaliacao_acompanhamento = (
            AvaliacaoAcompanhamentoFamiliar.objects.filter(prontuario_id=prontuario_id).order_by("-created_at").first()
        )
        novos_ingressos = list(
            NovoIngresso.objects.filter(prontuario_id=prontuario_id).order_by("-data_ingresso", "-created_at")
        )
        registros_desligamentos = list(
            RegistroDesligamento.objects.filter(prontuario_id=prontuario_id).order_by("-data_desligamento", "-created_at")
        )
        situacoes_violencia = list(
            SituacaoViolencia.objects.filter(prontuario_id=prontuario_id).order_by("created_at")
        )
        medidas_socioeducativas = list(
            AcompanhamentoCreas.objects.filter(prontuario_id=prontuario_id).order_by("created_at")
        )
        acolhimentos = list(
            AcolhimentoFamiliar.objects.select_related("membro")
            .filter(prontuario_id=prontuario_id)
            .order_by("created_at")
        )
        evolucoes = list(
            AnotacaoPlanejamento.objects.select_related("tecnico_responsavel")
            .filter(prontuario_id=prontuario_id)
            .order_by("created_at")
        )
        descumprimentos_condicionalidades_saude = list(
            DescumprimentoCondicionalidadesBolsa.objects.select_related("membro__cidadao")
            .filter(prontuario_id=prontuario_id)
            .order_by("-data_ocorrencia", "-created_at")
        )
        descumprimentos_condicionalidades_educacao = list(
            DescumprimentoEducacional.objects.select_related("membro__cidadao")
            .filter(prontuario_id=prontuario_id)
            .order_by("-data_ocorrencia", "-created_at")
        )
        cpfs_familia = [m.cidadao.cpf for m in membros if getattr(m, "cidadao", None) and getattr(m.cidadao, "cpf", None)]
        agendamentos_familia = list(
            Agendamento.objects.select_related("servico", "servico__classe", "cidadao")
            .filter(cidadao__cpf__in=cpfs_familia)
            .order_by("-data", "-horario", "-created_at")[:60]
        ) if cpfs_familia else []
        encaminhamentos = list(
            Encaminhamento.objects.select_related("codigo_area", "agendamento", "agendamento__cidadao")
            .filter(agendamento__cidadao__cpf__in=cpfs_familia)
            .order_by("-created_at")[:40]
        ) if cpfs_familia else []
        saude_geral = (
            CondicoesDeSaude.objects.filter(prontuario_id=prontuario_id).order_by("-created_at").first()
        )

        self._perfil_context = {
            "prontuario": prontuario,
            "pessoa_referencia": pessoa_referencia,
            "membros": membros,
            "condicoes_habitacionais": condicoes_habitacionais,
            "condicoes_educacionais": condicoes_educacionais,
            "condicoes_trabalho": condicoes_trabalho,
            "trabalho_rendimento_consolidado": trabalho_rendimento_consolidado,
            "condicoes_saude": condicoes_saude,
            "condicoes_saude_observacoes": (saude_geral.observacoes if saude_geral else ""),
            "beneficios_eventuais": beneficios_eventuais,
            "transferencias_renda": transferencias_renda,
            "participacoes_servicos": participacoes_servicos,
            "convivencia_familiar": convivencia_familiar,
            "avaliacao_acompanhamento": avaliacao_acompanhamento,
            "novos_ingressos": novos_ingressos,
            "registros_desligamentos": registros_desligamentos,
            "situacoes_violencia": situacoes_violencia,
            "medidas_socioeducativas": medidas_socioeducativas,
            "acolhimentos": acolhimentos,
            "evolucoes": evolucoes,
            "descumprimentos_condicionalidades_saude": descumprimentos_condicionalidades_saude,
            "descumprimentos_condicionalidades_educacao": descumprimentos_condicionalidades_educacao,
            "agendamentos_familia": agendamentos_familia,
            "encaminhamentos": encaminhamentos,
        }
        return self._perfil_context

    def _prontuario(self):
        return self._build_context().get("prontuario")

    def get_encontrado(self, obj):
        return self._prontuario() is not None

    def get_numero(self, obj):
        prontuario = self._prontuario()
        return prontuario.numero if prontuario else ""

    def get_unidade(self, obj):
        prontuario = self._prontuario()
        if not prontuario:
            return ""
        return getattr(prontuario.unidade_inicial, "nome", "")

    def get_pessoaReferenciaId(self, obj):
        pessoa_ref = self._build_context().get("pessoa_referencia")
        if not pessoa_ref or not pessoa_ref.pessoa_referencia_id:
            return ""
        return str(pessoa_ref.pessoa_referencia_id)

    def get_dataAbertura(self, obj):
        prontuario = self._prontuario()
        return self._iso_date(prontuario.created_at) if prontuario else ""

    def get_versao(self, obj):
        return "api-v1"

    def get_membros(self, obj):
        ctx = self._build_context()
        pessoa_ref = ctx.get("pessoa_referencia")
        pessoa_ref_id = str(pessoa_ref.pessoa_referencia_id) if pessoa_ref and pessoa_ref.pessoa_referencia_id else ""
        result = []

        for ordem, membro in enumerate(ctx.get("membros", []), start=1):
            cidadao = membro.cidadao
            if not cidadao:
                continue

            logradouro = pessoa_ref.logradouro if pessoa_ref and pessoa_ref.logradouro else cidadao.logradouro
            numero = pessoa_ref.numero if pessoa_ref and pessoa_ref.numero else cidadao.numero
            complemento = pessoa_ref.complemento if pessoa_ref and pessoa_ref.complemento else cidadao.complemento
            bairro_nome = ""
            if pessoa_ref and pessoa_ref.bairro:
                bairro_nome = pessoa_ref.bairro.nome or ""
            elif cidadao.bairro:
                bairro_nome = cidadao.bairro.nome or ""
            municipio = pessoa_ref.cidade if pessoa_ref and pessoa_ref.cidade else "Fortaleza"
            uf = pessoa_ref.estado if pessoa_ref and pessoa_ref.estado else "CE"
            cep = pessoa_ref.cep if pessoa_ref and pessoa_ref.cep else cidadao.cep
            ponto_ref = pessoa_ref.ponto_referencia if pessoa_ref and pessoa_ref.ponto_referencia else ""
            localizacao = self._display(pessoa_ref, "localizacao") if pessoa_ref else None
            especificidade_social = self._display(pessoa_ref, "especifidade_familia") if pessoa_ref else None
            povo_etnia = pessoa_ref.povo_etinia if pessoa_ref else None

            result.append(
                {
                    "id": str(cidadao.id),
                    "cpf": cidadao.cpf or "",
                    "nome": cidadao.nome or "",
                    "apelido": cidadao.apelido or "",
                    "email": cidadao.email or "",
                    "telefone": cidadao.telefone or "",
                    "sexo": cidadao.sexo or "",
                    "dataNascimento": self._iso_date(cidadao.data_nascimento),
                    "nomeMae": cidadao.mae or "",
                    "nis": cidadao.nis or "",
                    "rg": cidadao.rg or "",
                    "rgOrgao": cidadao.orgao_emissor or "",
                    "rgUf": cidadao.uf_rg or "",
                    "rgDataEmissao": self._iso_date(cidadao.data_emissao_rg),
                    "enderecoRua": logradouro or "",
                    "enderecoNumero": numero or "",
                    "enderecoComplemento": complemento or "",
                    "enderecoBairro": bairro_nome,
                    "enderecoMunicipio": municipio or "",
                    "enderecoUf": uf or "",
                    "enderecoCep": cep or "",
                    "enderecoPontoReferencia": ponto_ref or "",
                    "enderecoLocalizacao": localizacao or "",
                    "enderecoAbrigo": bool(pessoa_ref.abrigo) if pessoa_ref else False,
                    "especificidadeSocial": especificidade_social or "",
                    "povoEtnia": povo_etnia or "",
                    "parentesco": self._display(membro, "parentesco") or "Outro",
                    "ordem": ordem,
                }
            )

        # Garante pessoa de referência na primeira posição lógica
        result.sort(key=lambda item: 0 if str(item.get("id")) == pessoa_ref_id else 1)
        for idx, item in enumerate(result, start=1):
            item["ordem"] = idx

        return result

    def get_condicoesHabitacionais(self, obj):
        result = []
        for item in self._build_context().get("condicoes_habitacionais", []):
            result.append(
                {
                    "id": str(item.id),
                    "tipoMoradia": self._display(item, "tipo_residencia") or "",
                    "numeroComodos": item.total_comodos or 0,
                    "condicoesEstruturais": item.outras_observacoes or "",
                    "abastecimento": self._display(item, "abastecimento_agua") or "",
                    "saneamento": self._display(item, "esgotamento") or "",
                    "coleta": self._display(item, "coleta") or "",
                    "energia": self._display(item, "acesso_eletrico") or "",
                    "dataRegistro": self._iso_date(item.created_at),
                    "possuiAguaCanalizada": self._display(item, "agua_canalizada") or "",
                    "numeroDormitorios": item.total_dormitorios or 0,
                    "mediaPessoasPorDormitorio": str(item.media_dormitorios or ""),
                    "acessibilidade": self._display(item, "locomocao") or "",
                    "riscoDesabamento": self._display(item, "area_risco") or "",
                    "dificilAcesso": self._display(item, "dificil_acesso") or "",
                    "areaConflito": self._display(item, "area_conflito") or "",
                    "materialParedes": self._display(item, "material") or "",
                    "observacoesDiagnostico": item.outras_observacoes or "",
                }
            )
        return result

    def get_condicoesEducacionais(self, obj):
        result = []
        for item in self._build_context().get("condicoes_educacionais", []):
            membro_id = str(item.membro_id) if item.membro_id else ""
            cidadao_id = ""
            if item.membro and item.membro.cidadao_id:
                cidadao_id = str(item.membro.cidadao_id)
            result.append(
                {
                    "id": str(item.id),
                    "membroId": membro_id,
                    "cidadaoId": cidadao_id,
                    "escolaridade": self._display(item, "escolaridade") or "",
                    "alfabetizado": bool(item.alfabetizado) if item.alfabetizado is not None else False,
                    "frequenciaEscolar": self._display(item, "frequencia") or "",
                    "situacaoEscolar": self._display(item, "situacao") or "",
                    "observacoes": item.observacao or "",
                    "observacoesDiagnostico": item.observacao or "",
                    "dataRegistro": self._iso_date(item.created_at),
                }
            )
        return result

    def get_condicoesTrabalho(self, obj):
        result = []
        for item in self._build_context().get("condicoes_trabalho", []):
            ocupacao = self._display(item, "condicao_ocupacao") or ""
            renda = float(item.renda_individual) if item.renda_individual is not None else 0
            membro_nome = ""
            cidadao_id = ""
            if item.membro and getattr(item.membro, "cidadao", None):
                membro_nome = item.membro.cidadao.nome or ""
                cidadao_id = str(item.membro.cidadao_id)
            result.append(
                {
                    "id": str(item.id),
                    "membroId": str(item.membro_id) if item.membro_id else "",
                    "cidadaoId": cidadao_id,
                    "membroNome": membro_nome,
                    "ocupacao": ocupacao,
                    "vinculo": self._display(item, "vinculo_empregatico") or "",
                    "rendaIndividual": renda,
                    "carteiraAssinada": bool(item.carteira_assinada) if item.carteira_assinada is not None else False,
                    "desempregado": "desempregado" in ocupacao.lower(),
                    "observacoes": "",
                    "dataRegistro": self._iso_date(item.created_at),
                }
            )
        return result

    def get_rendaTotal(self, obj):
        consolidado = self._build_context().get("trabalho_rendimento_consolidado")
        if not consolidado or consolidado.renda_total is None:
            return None
        return float(consolidado.renda_total)

    def get_rendaPerCapita(self, obj):
        consolidado = self._build_context().get("trabalho_rendimento_consolidado")
        if not consolidado or consolidado.renda_per_capita is None:
            return None
        return float(consolidado.renda_per_capita)

    def get_condicoesSaude(self, obj):
        result = []
        for item in self._build_context().get("condicoes_saude", []):
            result.append(
                {
                    "id": str(item.id),
                    "membroId": str(item.membro_id) if item.membro_id else "",
                    "deficiencia": self._display(item, "deficiencia") or "",
                    "acompanhamentoMedico": self._display(item, "acompanhamento") or "",
                    "necessitaCuidadosConstantes": self._display(item, "cuidados_terceiros") or "",
                    "cuidadosConstantesResponsavel": item.realiza_cuidados or "",
                    "doencasGraves": item.doencas_graves or "",
                    "remediosTarjaPreta": self._display(item, "remedio") or "",
                    "usoAlcool": self._display(item, "alcool") or "",
                    "usoDrogas": self._display(item, "drogas") or "",
                    "usoDrogasQuais": item.substancia or "",
                    "tratamentos": item.tratamentos or "",
                    "medicacao": item.medicamentos or "",
                    "dataRegistro": self._iso_date(item.created_at),
                }
            )
        return result

    def get_condicoesSaudeObservacoes(self, obj):
        return self._build_context().get("condicoes_saude_observacoes", "") or ""

    def get_beneficiosEventuais(self, obj):
        result = []
        for item in self._build_context().get("beneficios_eventuais", []):
            result.append(
                {
                    "id": str(item.id),
                    "tipo": self._display(item, "beneficio") or "",
                    "dataConcessao": self._iso_date(item.created_at),
                    "observacoes": item.observacao or "",
                    "observacao": item.observacao or "",
                    "cpfFalecido": item.cpf_falecido or "",
                    "registroNascimento": item.registro_nascimento or "",
                }
            )
        return result

    def get_transferenciasRenda(self, obj):
        result = []
        for item in self._build_context().get("transferencias_renda", []):
            result.append(
                {
                    "id": str(item.id),
                    "beneficio": (item.beneficio.nome if getattr(item, "beneficio", None) and getattr(item.beneficio, "nome", None) else ""),
                    "beneficioId": str(item.beneficio_id) if item.beneficio_id else "",
                    "valor": float(item.valor) if item.valor is not None else 0,
                    "dataRegistro": self._iso_date(item.created_at),
                }
            )
        return result

    def get_participacoesServicos(self, obj):
        result = []
        for item in self._build_context().get("participacoes_servicos", []):
            cidadao_id = ""
            membro_nome = ""
            if item.membro and getattr(item.membro, "cidadao", None):
                cidadao_id = str(item.membro.cidadao_id)
                membro_nome = item.membro.cidadao.nome or ""
            result.append(
                {
                    "id": str(item.id),
                    "membroId": str(item.membro_id) if item.membro_id else "",
                    "cidadaoId": cidadao_id,
                    "membroNome": membro_nome,
                    "servico": item.servico or "",
                    "dataInicio": self._iso_date(item.data_inicio),
                    "frequencia": "",
                    "unidadeRealizacao": self._display(item, "unidade_realizacao") or "",
                    "observacoes": "",
                }
            )
        return result

    def get_acessoBeneficiosServicos(self, obj):
        ctx = self._build_context()
        pessoa_ref = ctx.get("pessoa_referencia")

        beneficios_sociais = []
        if pessoa_ref:
            beneficios_sociais = [b.nome for b in pessoa_ref.beneficio.all() if getattr(b, "nome", None)]

        beneficios_sociais_norm = [nome.lower() for nome in beneficios_sociais]
        possui_bpc = any("bpc" in nome for nome in beneficios_sociais_norm)
        possui_bolsa_familia = any("bolsa" in nome and "famil" in nome for nome in beneficios_sociais_norm)

        beneficios_eventuais = ctx.get("beneficios_eventuais", [])
        ultima_data = None
        if beneficios_eventuais:
            ultima_data = max((item.created_at for item in beneficios_eventuais if getattr(item, "created_at", None)), default=None)

        participacoes = ctx.get("participacoes_servicos", [])
        servicos_cras = []
        for item in participacoes:
            nome = (item.servico or "").strip()
            if nome and nome not in servicos_cras:
                servicos_cras.append(nome)

        hoje = date.today()
        acompanhamentos_creas = ctx.get("medidas_socioeducativas", [])
        creas_ativos = [item for item in acompanhamentos_creas if getattr(item, "data_final", None) and item.data_final >= hoje]
        proxima_renovacao = min((item.data_final for item in creas_ativos), default=None)

        return {
            "beneficiosSociaisAtivos": beneficios_sociais,
            "possuiBpc": possui_bpc,
            "possuiBolsaFamilia": possui_bolsa_familia,
            "beneficiosEventuaisTotal": len(beneficios_eventuais),
            "ultimaConcessaoBeneficioEventual": self._iso_date(ultima_data),
            "servicosCrasEmAcompanhamento": servicos_cras,
            "servicosCrasEmAcompanhamentoTotal": len(servicos_cras),
            "acompanhamentosCreasAtivos": len(creas_ativos),
            "proximaRenovacaoOuAcompanhamento": self._iso_date(proxima_renovacao),
        }

    def get_convivenciaFamiliar(self, obj):
        conviv = self._build_context().get("convivencia_familiar")
        if not conviv:
            return {}

        return {
            "tempoEstado": conviv.tempo_estado,
            "tempoMunicipio": conviv.tempo_municipio,
            "tempoBairro": conviv.tempo_bairro,
            "vitimaAmeaca": self._display(conviv, "vitima_ameaca") or "",
            "redeApoioParentes": self._display(conviv, "parente_proximo") or "",
            "redeApoioVizinhos": self._display(conviv, "vizinhos_apoio") or "",
            "grupoReligioso": self._display(conviv, "grupo_religioso") or "",
            "movimentoSocial": self._display(conviv, "movimento_social") or "",
            "lazerCrianca": self._display(conviv, "atividade_lazer_crianca") or "",
            "lazerIdoso": self._display(conviv, "atividade_lazer_idoso") or "",
            "dependentesSemAdulto": self._display(conviv, "companhia_adulto") or "",
            "conflitosConjugais": self._display(conviv, "conflitos_conjugais") or "",
            "conflitosResponsaveis": self._display(conviv, "conflitos_responsaveis") or "",
            "conflitosIrmaos": self._display(conviv, "conflitos_irmaos") or "",
            "conflitosOutros": self._display(conviv, "conflitos_outros") or "",
            "observacoes": conviv.outras_observacoes or "",
        }

    def get_avaliacaoAcompanhamento(self, obj):
        avaliacao = self._build_context().get("avaliacao_acompanhamento")
        if not avaliacao:
            return {}

        return {
            "ofertasAssistencia": self._display(avaliacao, "ofertas_assistencia") or "",
            "encaminhamentos": self._display(avaliacao, "encaminhamentos") or "",
            "vinculoFamilia": self._display(avaliacao, "vinculo_familia") or "",
            "statusVulnerabilidade": self._display(avaliacao, "status") or "",
            "analise": avaliacao.analise or "",
            "dataRegistro": self._iso_date(avaliacao.created_at),
        }

    def get_ciclosAcompanhamento(self, obj):
        ciclos = []
        for item in self._build_context().get("novos_ingressos", []):
            ciclos.append(
                {
                    "id": f"ingresso-{item.id}",
                    "tipo": "INGRESSO",
                    "data": self._iso_date(item.data_ingresso),
                    "motivo": item.motivo or "",
                    "observacoes": item.observacoes or "",
                }
            )
        for item in self._build_context().get("registros_desligamentos", []):
            ciclos.append(
                {
                    "id": f"desligamento-{item.id}",
                    "tipo": "DESLIGAMENTO",
                    "data": self._iso_date(item.data_desligamento),
                    "motivo": self._display(item, "motivo") or "",
                    "observacoes": item.observacoes or "",
                }
            )

        ciclos.sort(key=lambda registro: (registro.get("data") or "", registro.get("id") or ""), reverse=True)
        return ciclos

    def get_situacoesViolencia(self, obj):
        result = []
        for item in self._build_context().get("situacoes_violencia", []):
            marcadores = []
            campos_violencia = [
                "trabalho_infantil",
                "negligencia",
                "situacao_trabalho_rua",
                "exploracao_sexual",
                "violencia_sexual",
                "violencia_fisica",
                "violencia_psicologica",
                "trafico_pessoa",
                "idoso_negligencia",
                "deficiente_negligencia",
                "violencia_patrimonial",
                "violencia_vivenciada",
            ]
            for campo in campos_violencia:
                valor = (self._display(item, campo) or "").strip().lower()
                if valor in {"sim", "s"}:
                    marcadores.append(campo)

            result.append(
                {
                    "id": str(item.id),
                    "membroId": self.get_pessoaReferenciaId(obj),
                    "tipoViolencia": ", ".join(marcadores) if marcadores else "Sem marcador ativo",
                    "dataOcorrencia": self._iso_date(item.created_at),
                    "autorViolencia": "",
                    "acompanhamento": bool(item.acompanhamento_creas.exists()),
                    "medidasProtetivas": "",
                    "observacoes": item.observacao or "",
                }
            )
        return result

    def get_medidasSocioeducativas(self, obj):
        result = []
        for item in self._build_context().get("medidas_socioeducativas", []):
            result.append(
                {
                    "id": str(item.id),
                    "membroId": self.get_pessoaReferenciaId(obj),
                    "medida": item.identificao_creas or "",
                    "dataInicio": self._iso_date(item.data_inicio),
                    "dataTermino": self._iso_date(item.data_final),
                    "responsavel": "CREAS",
                    "observacoes": "",
                }
            )
        return result

    def get_acolhimentos(self, obj):
        result = []
        for item in self._build_context().get("acolhimentos", []):
            result.append(
                {
                    "id": str(item.id),
                    "membroId": str(item.membro_id) if item.membro_id else "",
                    "instituicao": "",
                    "dataEntrada": self._iso_date(item.data_entrada),
                    "dataSaida": self._iso_date(item.data_saida),
                    "motivo": item.motivo or "",
                    "observacoes": item.detalhe or "",
                }
            )
        return result

    def get_evolucoes(self, obj):
        result = []
        for item in self._build_context().get("evolucoes", []):
            tecnico = item.tecnico_responsavel.nome_completo if item.tecnico_responsavel else ""
            result.append(
                {
                    "id": str(item.id),
                    "data": self._iso_date(item.created_at),
                    "tecnico": tecnico,
                    "metas": "",
                    "necessidades": "",
                    "evolucao": item.anotacao or "",
                    "visitasTecnicas": 0,
                    "observacoes": "",
                }
            )
        return result

    def get_servicosAtendimento(self, obj):
        result = []
        for item in self._build_context().get("agendamentos_familia", []):
            status = "Não Realizado - Indisponibilidade de Recurso"
            if item.situacao == "FINALIZADO":
                status = "Realizado"
            elif item.situacao in {"CANCELADO_CIDADAO", "CANCELADO_CRAS"}:
                status = "Cancelado"
            elif item.situacao in {"AUSENCIA_CIDADAO", "ATIVADO_AUSENTE"}:
                status = "Não Realizado - Recusa do Cidadão"
            elif item.final_atendimento:
                status = item.get_final_atendimento_display() if hasattr(item, "get_final_atendimento_display") else str(item.final_atendimento)

            result.append(
                {
                    "id": str(item.id),
                    "servico": getattr(item.servico, "nome", "") or "",
                    "categoria": getattr(getattr(item.servico, "classe", None), "nome", "") or "",
                    "status": status,
                    "observacoes": item.observacoes_gerais or "",
                    "data": self._iso_date(item.data),
                    "membroNome": getattr(getattr(item, "cidadao", None), "nome", "") or "",
                }
            )
        return result

    def get_encaminhamentos(self, obj):
        result = []
        for item in self._build_context().get("encaminhamentos", []):
            codigo_area = ""
            if item.codigo_area:
                codigo_area = f"{item.codigo_area.codigo} - {item.codigo_area.nome}"

            result.append(
                {
                    "id": str(item.id),
                    "cpfReferencia": getattr(getattr(item.agendamento, "cidadao", None), "cpf", "") or "",
                    "codigoArea": codigo_area,
                    "orgaoUnidadeDestino": item.unidade_destino or "",
                    "objetivoMotivo": item.motivo or "",
                    "resumoAcompanhamento": item.resumo or "",
                    "dataRegistro": self._iso_date(item.created_at),
                    "profissionalRegistro": item.profissional or "",
                    "unidadeOrigem": item.unidade_origem or "",
                    "telefoneContatoOrigem": "",
                    "unidadeDestino": item.unidade_destino or "",
                    "profissionalDestino": "",
                    "observacoes": item.orientacoes or "",
                }
            )
        return result

    def get_descumprimentosCondicionalidades(self, obj):
        result = []

        for item in self._build_context().get("descumprimentos_condicionalidades_saude", []):
            membro_id = str(item.membro_id) if item.membro_id else ""
            membro_nome = ""
            if item.membro and getattr(item.membro, "cidadao", None):
                membro_nome = item.membro.cidadao.nome or ""

            result.append(
                {
                    "id": str(item.id),
                    "membroId": membro_id,
                    "membroNome": membro_nome,
                    "dataOcorrencia": self._iso_date(item.data_ocorrencia),
                    "efeitoCodigo": item.efeito_codigo or "",
                    "efeito": self._display(item, "efeito_codigo") or "",
                    "ondeDescumpriu": "Saúde",
                }
            )

        for item in self._build_context().get("descumprimentos_condicionalidades_educacao", []):
            membro_id = str(item.membro_id) if item.membro_id else ""
            membro_nome = ""
            if item.membro and getattr(item.membro, "cidadao", None):
                membro_nome = item.membro.cidadao.nome or ""

            result.append(
                {
                    "id": str(item.id),
                    "membroId": membro_id,
                    "membroNome": membro_nome,
                    "dataOcorrencia": self._iso_date(item.data_ocorrencia),
                    "efeitoCodigo": item.efeito_codigo or "",
                    "efeito": self._display(item, "efeito_codigo") or "",
                    "ondeDescumpriu": "Educação",
                }
            )

        result.sort(key=lambda registro: (registro.get("dataOcorrencia") or ""), reverse=True)
        return result

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
