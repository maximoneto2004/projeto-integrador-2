from django_filters import rest_framework as filters
from .models import FichaAtendimentoFamiliar, MembroFamiliar


class FichaAtendimentoFamiliarFilter(filters.FilterSet):
    inscricao = filters.CharFilter(field_name="inscricao", lookup_expr="icontains")
    unidade = filters.CharFilter(
        field_name="unidade_de_atendimento", lookup_expr="icontains"
    )
    orgao = filters.CharFilter(field_name="orgao", lookup_expr="icontains")
    prontuario = filters.CharFilter(field_name="prontuario", lookup_expr="icontains")
    responsavel = filters.CharFilter(field_name="responsavel", lookup_expr="icontains")

    class Meta:
        model = FichaAtendimentoFamiliar
        fields = [
            "inscricao",
            "unidade",
            "orgao",
            "prontuario",
            "responsavel",
        ]


class MembroFamiliarFilter(filters.FilterSet):
    cidadao = filters.CharFilter(field_name="cidadao", lookup_expr="icontains")
    parentesco = filters.CharFilter(field_name="parentesco", lookup_expr="icontains")
    escolaridade = filters.CharFilter(
        field_name="escolaridade", lookup_expr="icontains"
    )

    class Meta:
        model = MembroFamiliar
        fields = ["cidadao", "parentesco", "escolaridade"]
