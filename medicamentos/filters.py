import django_filters
from django.db.models import Q
from django_filters import rest_framework as filters

from medicamentos.models import Medicamento


class MedicamentoFilter(filters.FilterSet):
    busca = django_filters.CharFilter(method="filtrar_busca")
    nome = django_filters.CharFilter(field_name="nome", lookup_expr="icontains")
    principio_ativo = django_filters.CharFilter(field_name="principio_ativo", lookup_expr="icontains")
    classe_terapeutica = django_filters.CharFilter(field_name="classe_terapeutica", lookup_expr="icontains")

    class Meta:
        model = Medicamento
        fields = [
            "busca",
            "nome",
            "principio_ativo",
            "classe_terapeutica",
            "forma_farmaceutica",
            "via_administracao",
            "controlado",
            "is_active",
        ]

    def filtrar_busca(self, queryset, name, value):
        return queryset.filter(
            Q(nome__icontains=value) | Q(principio_ativo__icontains=value) | Q(codigo_registro__icontains=value)
        )
