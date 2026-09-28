import django_filters
from django.db.models import Q
from django.utils import timezone
from django_filters import rest_framework as filters

from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque


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


class LoteMedicamentoFilter(filters.FilterSet):
    numero_lote = django_filters.CharFilter(field_name="numero_lote", lookup_expr="icontains")
    validade_ate = django_filters.DateFilter(field_name="validade", lookup_expr="lte")
    vencido = django_filters.BooleanFilter(method="filtrar_vencido")
    com_saldo = django_filters.BooleanFilter(method="filtrar_com_saldo")

    class Meta:
        model = LoteMedicamento
        fields = ["medicamento", "unidade", "numero_lote", "validade_ate", "vencido", "com_saldo", "is_active"]

    def filtrar_vencido(self, queryset, name, value):
        hoje = timezone.localdate()
        return queryset.filter(validade__lt=hoje) if value else queryset.filter(validade__gte=hoje)

    def filtrar_com_saldo(self, queryset, name, value):
        return queryset.filter(quantidade_atual__gt=0) if value else queryset.filter(quantidade_atual=0)


class MovimentacaoEstoqueFilter(filters.FilterSet):
    medicamento = django_filters.UUIDFilter(field_name="lote__medicamento_id")
    unidade = django_filters.UUIDFilter(field_name="lote__unidade_id")
    data_inicio = django_filters.DateFilter(field_name="data", lookup_expr="date__gte")
    data_fim = django_filters.DateFilter(field_name="data", lookup_expr="date__lte")

    class Meta:
        model = MovimentacaoEstoque
        fields = ["lote", "medicamento", "unidade", "tipo", "receita_item", "data_inicio", "data_fim"]
