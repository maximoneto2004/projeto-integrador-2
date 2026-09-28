import re
import django_filters
from django.db.models import Q
from django.utils import timezone
from app.static_data import STATUS_DISPENSACAO_PARCIAL, STATUS_DISPENSACAO_PENDENTE
from .models import (
    BeneficioSocial,
    BeneficiosEventuais,
    BeneficiosServicos,
    CondicaoEducacional,
    CondicaoEducacionalMembro,
    ConvivenviaFortalecimento,
    CondicoesDeSaude,
    DescumprimentoCondicionalidadesBolsa,
    PessoaReferencia,
    MembroComposicao,
    CondicaoHabitacional,
    SaudeCuidadosMembro,
    TrabalhoRendimentoMembro,
    TransferenciaRenda,
    TrabalhoRendimento,
    Unidade,
    Prontuario,
    ConvivenciaFamiliar,
    AcompanhamentoCreas,
    SituacaoViolencia,
    AcolhimentoFamiliar,
    AcolhimentoInstitucional,
    AnotacaoPlanejamento,
    NovoIngresso,
    RegistroDesligamento,
    EvolucaoAcompanhamento,
    AvaliacaoAcompanhamentoFamiliar,
    MedidaSocioEducativaMembro,
    AcompanhamentoLAPSC,
    MedidaSocioEducativa,
    Receita,
    ReceitaMedicamento,
)


class PessoaReferenciaFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = PessoaReferencia
        fields = ["prontuario"]


class MembroComposicaoFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = MembroComposicao
        fields = ["prontuario"]


class CondicaoHabitacionalFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = CondicaoHabitacional
        fields = ["prontuario"]

class UnidadeFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = Unidade
        fields = ["prontuario"]

class BeneficioSocialFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = BeneficioSocial
        fields = ["prontuario"]


class CondicaoEducacionalFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = CondicaoEducacional
        fields = ["prontuario"]


class CondicaoEducacionalMembroFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")
    membro = django_filters.CharFilter(field_name="membro__id")

    class Meta:
        model = CondicaoEducacionalMembro
        fields = ["prontuario", "membro"]


class ProntuarioFilter(django_filters.FilterSet):
    numero = django_filters.CharFilter(field_name="numero", lookup_expr="icontains")
    unidade_inicial = django_filters.CharFilter(field_name="unidade_inicial__id")
    search = django_filters.CharFilter(method="filter_search")

    def filter_search(self, queryset, name, value):
        termo = (value or "").strip()
        if not termo:
            return queryset
        cpf = re.sub(r"\D", "", termo)
        query = Q(numero__icontains=termo) | Q(membros__cidadao__nome__icontains=termo)
        if cpf:
            query = query | Q(membros__cidadao__cpf__icontains=cpf)
        return queryset.filter(query).distinct()

    class Meta:
        model = Prontuario
        fields = ["numero", "unidade_inicial", "search"]


class TrabalhoRendimentoMembroFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = TrabalhoRendimentoMembro
        fields = ["prontuario"]


class SaudeCuidadosMembroFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = SaudeCuidadosMembro
        fields = ["prontuario"]


class CondicoesDeSaudeFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = CondicoesDeSaude
        fields = ["prontuario"]


class BeneficiosEventuaisFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = BeneficiosEventuais
        fields = ["prontuario"]


class ConvivenviaFortalecimentoFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = ConvivenviaFortalecimento
        fields = ["prontuario"]


class BeneficiosServicosFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = BeneficiosServicos
        fields = ["prontuario"]


class DescumprimentoCondicionalidadesBolsaFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = DescumprimentoCondicionalidadesBolsa
        fields = ["prontuario"]


class TransferenciaRendaFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = TransferenciaRenda
        fields = ["prontuario"]


class TrabalhoRendimentoFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = TrabalhoRendimento
        fields = ["prontuario"]


class ConvivenciaFamiliarFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = ConvivenciaFamiliar
        fields = ["prontuario"]


class AcompanhamentoCreasFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = AcompanhamentoCreas
        fields = ["prontuario"]


class SituacaoViolenciaFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = SituacaoViolencia
        fields = ["prontuario"]


class AcolhimentoFamiliarFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = AcolhimentoFamiliar
        fields = ["prontuario"]


class AcolhimentoInstitucionalFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = AcolhimentoInstitucional
        fields = ["prontuario"]


class AnotacaoPlanejamentoFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = AnotacaoPlanejamento
        fields = ["prontuario"]


class NovoIngressoFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = NovoIngresso
        fields = ["prontuario"]


class RegistroDesligamentoFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = RegistroDesligamento
        fields = ["prontuario"]


class EvolucaoAcompanhamentoFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = EvolucaoAcompanhamento
        fields = ["prontuario"]


class AvaliacaoAcompanhamentoFamiliarFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = AvaliacaoAcompanhamentoFamiliar
        fields = ["prontuario"]


class MedidaSocioEducativaMembroFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = MedidaSocioEducativaMembro
        fields = ["prontuario"]


class AcompanhamentoLAPSCFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = AcompanhamentoLAPSC
        fields = ["prontuario"]


class MedidaSocioEducativaFilter(django_filters.FilterSet):
    prontuario = django_filters.CharFilter(field_name="prontuario__id")

    class Meta:
        model = MedidaSocioEducativa
        fields = ["prontuario"]


class ReceitaFilter(django_filters.FilterSet):
    agendamento = django_filters.CharFilter(field_name="agendamento__id")
    cidadao = django_filters.CharFilter(field_name="cidadao__id")
    search = django_filters.CharFilter(method="filter_search")
    medicamento = django_filters.UUIDFilter(field_name="medicamentos__medicamento_id", distinct=True)
    vigente = django_filters.BooleanFilter(method="filter_vigente")
    pendente_dispensacao = django_filters.BooleanFilter(method="filter_pendente_dispensacao")

    def filter_vigente(self, queryset, name, value):
        hoje = timezone.localdate()
        return queryset.filter(data_validade__gte=hoje) if value else queryset.filter(data_validade__lt=hoje)

    def filter_pendente_dispensacao(self, queryset, name, value):
        com_item_pendente = ReceitaMedicamento.objects.filter(
            medicamento__isnull=False,
            status_dispensacao__in=[STATUS_DISPENSACAO_PENDENTE, STATUS_DISPENSACAO_PARCIAL],
        ).values("receita_id")
        return queryset.filter(id__in=com_item_pendente) if value else queryset.exclude(id__in=com_item_pendente)

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(cidadao__nome__icontains=value)
            | Q(cidadao__cpf__icontains=value)
            | Q(medicamentos__nome__icontains=value)
        ).distinct()

    class Meta:
        model = Receita
        fields = ["agendamento", "cidadao", "search", "medicamento", "vigente", "pendente_dispensacao"]
