from django_filters import rest_framework as filters
from django.db.models import Q
from .models import Duvida


class DuvidaFilter(filters.FilterSet):
    pergunta = filters.CharFilter(method="filter_search")

    class Meta:
        model = Duvida
        fields = ["pergunta"]

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(pergunta__icontains=value) |
            Q(resposta__icontains=value)
        )
