import django_filters
from .models import ServicoUnidadePosto, BloqueioHorario, UnidadePosto
from django.db.models import Q

class UnidadePostoFilter(django_filters.FilterSet):
    bairro = django_filters.UUIDFilter(field_name="bairro__id", lookup_expr="exact", label="Bairro")
    nome = django_filters.CharFilter(method="filter_busca", label="Busca")
    
    class Meta:
        model = UnidadePosto
        fields = ["bairro", "nome"]

    def filter_busca(self, queryset, name, value):
        return queryset.filter(
            Q(nome__icontains=value) |
            Q(bairro__nome__icontains=value) |
            Q(email__icontains=value) |
            Q(telefone__icontains=value)
        )


class UnidadePostoMapaFilter(django_filters.FilterSet):
    bairro = django_filters.UUIDFilter(
        field_name="bairro__id", lookup_expr="exact", label="Bairro"
    )
    nome = django_filters.CharFilter(method="filter_busca", label="Busca")
   

    class Meta:
        model = UnidadePosto
        fields = ["bairro", "nome"]

    def filter_busca(self, queryset, name, value):
        return queryset.filter(
            Q(nome__icontains=value)
            | Q(logradouro__icontains=value)
            | Q(bairro__nome__icontains=value)
        )




class ServicoUnidadePostoDiaFilter(django_filters.FilterSet):
    data = django_filters.CharFilter(field_name='data', lookup_expr='icontains', label='Informar a data no formato DD/MM/YYYY')

    class Meta:
        model = ServicoUnidadePosto
        fields = ['data']

class ServicoUnidadePostoUnidadeFilter(django_filters.FilterSet):
    unidade = django_filters.UUIDFilter(field_name='unidade__id', lookup_expr='exact', label='Unidade Posto')
    data = django_filters.CharFilter(field_name='data', lookup_expr='icontains', label='Informar a data no formato DD/MM/YYYY')
    class Meta:
        model = ServicoUnidadePosto
        fields = ['unidade', 'data']


class BloqueioHorarioUnidadeFilter(django_filters.FilterSet):
    unidade = django_filters.UUIDFilter(field_name='unidades__id', lookup_expr='exact', label='Unidade Posto')

    class Meta:
        model = BloqueioHorario
        fields = ['unidade']
