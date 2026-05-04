import django_filters
from .models import Usuario, EscalaTrabalho
from unidade_cras.models import Guiche


class UsuarioFilter(django_filters.FilterSet):
    unidade = django_filters.CharFilter(field_name="unidades_lotacao__id")
    nome_completo = django_filters.CharFilter(
        field_name="nome_completo", lookup_expr="icontains"
    )
    cpf = django_filters.CharFilter(field_name="cpf", lookup_expr="icontains")

    class Meta:
        model = Usuario
        fields = ["unidade", "nome_completo", "cpf"]


class EscalaTrabalhoFilter(django_filters.FilterSet):
    profissional = django_filters.CharFilter(field_name="profissional__id")
    unidade = django_filters.CharFilter(field_name="unidade__id")

    class Meta:
        model = EscalaTrabalho
        fields = ["profissional", "unidade"]


class GuicheFilter(django_filters.FilterSet):
    unidade = django_filters.UUIDFilter(field_name="unidade__id", lookup_expr="exact")
    nome = django_filters.CharFilter(field_name="nome",lookup_expr="icontains"
    )

    class Meta:
        model = Guiche
        fields = ["unidade","nome"]
