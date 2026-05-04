import re
import django_filters
from django.db.models import Q
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
