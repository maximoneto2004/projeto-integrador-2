import django_filters
from .models import AgendaVaga, Agendamento


class AgendaVagaFilter(django_filters.FilterSet):
    dia = django_filters.DateFilter(field_name="data", lookup_expr="day")
    tipo_servico = django_filters.CharFilter(field_name="tipo_servico__id")
    unidade = django_filters.CharFilter(field_name="unidade__id")

    class Meta:
        model = AgendaVaga
        fields = ["data", "tipo_servico", "unidade", "horario"]


class AgendamentoFilter(django_filters.FilterSet):
    cidadao = django_filters.CharFilter(field_name="cidadao__id")
    cpf = django_filters.CharFilter(field_name="cidadao__cpf", lookup_expr="iexact")
    nome = django_filters.CharFilter(
        field_name="cidadao__nome", lookup_expr="icontains"
    )
    atendente = django_filters.CharFilter(field_name="atendente__id")
    servico = django_filters.CharFilter(field_name="servico__id")
    tipo_servico = django_filters.CharFilter(field_name="servico__tipo_servico__id")
    unidade = django_filters.CharFilter(field_name="unidade__id")
    data = django_filters.DateFilter(field_name="data", lookup_expr="exact")
    situacao = django_filters.CharFilter(field_name="situacao")

    class Meta:
        model = Agendamento
        fields = [
            "cidadao",
            "unidade",
            "data",
            "situacao",
            "servico",
            "tipo_servico",
            "atendente",
            "cpf",
            "nome",
            "origem",
        ]
