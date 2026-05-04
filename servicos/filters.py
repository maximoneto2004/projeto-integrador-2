import django_filters
from django_filters import rest_framework as filters
from servicos.models import Servico, ClasseServico, TipoServico


class ServicoFilter(filters.FilterSet):
    servico_id = django_filters.CharFilter(field_name="servico_id")
    classe_id = django_filters.CharFilter(field_name="classe__id")
    tipo_servico_id = django_filters.CharFilter(field_name="tipo_servico_id")
    nome = django_filters.CharFilter(field_name="nome", lookup_expr="icontains")
    unidade = django_filters.UUIDFilter(
        field_name="unidades_cras__unidade__id", lookup_expr="exact"
    )

    class Meta:
        model = Servico
        fields = ["servico_id", "classe_id", "tipo_servico_id", "nome", "unidade"]


class ClasseServicoFilter(filters.FilterSet):
    nome = django_filters.CharFilter(field_name="nome", lookup_expr="icontains")
    unidade = django_filters.UUIDFilter(
        field_name="servico__unidades_cras__unidade__id",
        lookup_expr="exact",
        distinct=True,
    )

    class Meta:
        model = ClasseServico
        fields = ["nome", "unidade"]


class TipoServicoFilter(filters.FilterSet):
    nome = django_filters.CharFilter(field_name="nome", lookup_expr="icontains")
   

    class Meta:
        model = TipoServico
        fields = ["nome"]
