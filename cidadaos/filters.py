from django_filters import rest_framework as filters
from django.db import connection
from django.db.models import Q

from .models import Cidadao




class CidadaoFilter(filters.FilterSet):
    search = filters.CharFilter(method='filter_search', label='Busca')
    cpf = filters.CharFilter(method='filter_search', label='Busca CPF')


    class Meta:
        model = Cidadao
        fields = ['search', 'cpf',]
    
    def filter_search(self, queryset, name, value):
        termo = (value or "").strip()
        if not termo:
            return queryset

        query = Q(cpf__icontains=termo)
        if connection.vendor == "postgresql":
            query |= Q(nome__unaccent__icontains=termo)
        else:
            query |= Q(nome__icontains=termo)

        return queryset.filter(query).distinct()
