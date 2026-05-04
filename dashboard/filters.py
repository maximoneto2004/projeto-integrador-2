import django_filters
from django_filters import rest_framework as filters
from agendamentos.models import Agendamento


class DashboardSupervisorFilter(filters.FilterSet):
    unidade_id = django_filters.CharFilter(field_name="unidade_id")
    data_inicio = django_filters.DateFilter(field_name="data", lookup_expr="gte")
    data_fim = django_filters.DateFilter(field_name="data", lookup_expr="lte")

    class Meta:
        model = Agendamento
        fields = ["unidade_id", "data_inicio", "data_fim"]


class DashboardGestorFilter(filters.FilterSet):
    data_inicio = django_filters.DateFilter(field_name="data", lookup_expr="gte")
    data_fim = django_filters.DateFilter(field_name="data", lookup_expr="lte")

    class Meta:
        model = Agendamento
        fields = ["data_inicio", "data_fim"]

class DashboardMonitorUnidadeFilter(filters.FilterSet):
    unidade_id = django_filters.CharFilter(field_name="unidade_id")
    data_inicio = django_filters.DateFilter(field_name="data", lookup_expr="gte")
    data_fim = django_filters.DateFilter(field_name="data", lookup_expr="lte")

    class Meta:
        model = Agendamento
        fields = ["unidade_id", "data_inicio", "data_fim"]
