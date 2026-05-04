import django_filters
from .models import FilaEspera


class FilaEsperaFilter(django_filters.FilterSet):
    unidade = django_filters.CharFilter(field_name="unidade__id")
    data = django_filters.DateFilter(field_name="created_at", lookup_expr="date")

    class Meta:
        model = FilaEspera
        fields = ["unidade", "data"]
