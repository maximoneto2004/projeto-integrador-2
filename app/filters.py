import django_filters

from .models import Bairro


class BairroFilter(django_filters.FilterSet):
    nome = django_filters.CharFilter(field_name="nome", lookup_expr="icontains")

    class Meta:
        model = Bairro
        fields = ["nome"]
