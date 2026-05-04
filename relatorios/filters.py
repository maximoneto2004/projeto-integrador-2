from django_filters import rest_framework as filters
from django.utils import timezone

from prontuario.models import NovoIngresso, Prontuario


class RelatorioAtendimentosTecnicoFilter(filters.FilterSet):
    mes_referencia = filters.NumberFilter(method="filter_mes_referencia")
    ano_referencia = filters.NumberFilter(method="filter_ano_referencia")
    unidade_cras = filters.UUIDFilter(method="filter_unidade_cras")

    class Meta:
        model = NovoIngresso
        fields = ["mes_referencia", "ano_referencia", "unidade_cras"]

    def __init__(self, data=None, queryset=None, *, request=None, prefix=None):
        if data is not None:
            data = data.copy()
            hoje = timezone.localdate()
            if not data.get("mes_referencia"):
                data["mes_referencia"] = str(hoje.month)
            if not data.get("ano_referencia"):
                data["ano_referencia"] = str(hoje.year)
        super().__init__(data=data, queryset=queryset, request=request, prefix=prefix)

    def filter_mes_referencia(self, queryset, name, value):
        return queryset.filter(data_ingresso__month=value)

    def filter_ano_referencia(self, queryset, name, value):
        return queryset.filter(data_ingresso__year=value)

    def filter_unidade_cras(self, queryset, name, value):
        return queryset.filter(prontuario__unidade_inicial_id=value)


class RelatorioAtividadesCadunicoFilter(filters.FilterSet):
    ano_referencia = filters.NumberFilter(method="filter_ano_referencia")
    unidade_cras = filters.UUIDFilter(method="filter_unidade_cras")

    class Meta:
        model = NovoIngresso
        fields = ["ano_referencia", "unidade_cras"]

    def __init__(self, data=None, queryset=None, *, request=None, prefix=None):
        if data is not None:
            data = data.copy()
            hoje = timezone.localdate()
            if not data.get("ano_referencia"):
                data["ano_referencia"] = str(hoje.year)
        super().__init__(data=data, queryset=queryset, request=request, prefix=prefix)

    def filter_ano_referencia(self, queryset, name, value):
        return queryset.filter(data_ingresso__year=value)

    def filter_unidade_cras(self, queryset, name, value):
        return queryset.filter(prontuario__unidade_inicial_id=value)


class RelatorioQuantitativoMensalFilter(filters.FilterSet):
    mes_referencia = filters.NumberFilter(method="filter_mes_referencia")
    ano_referencia = filters.NumberFilter(method="filter_ano_referencia")
    unidade_cras = filters.UUIDFilter(method="filter_unidade_cras")

    class Meta:
        model = Prontuario
        fields = ["mes_referencia", "ano_referencia", "unidade_cras"]

    def __init__(self, data=None, queryset=None, *, request=None, prefix=None):
        if data is not None:
            data = data.copy()
            hoje = timezone.localdate()
            if not data.get("mes_referencia"):
                data["mes_referencia"] = str(hoje.month)
            if not data.get("ano_referencia"):
                data["ano_referencia"] = str(hoje.year)
        super().__init__(data=data, queryset=queryset, request=request, prefix=prefix)

    def filter_mes_referencia(self, queryset, name, value):
        return queryset.filter(created_at__month=value)

    def filter_ano_referencia(self, queryset, name, value):
        return queryset.filter(created_at__year=value)

    def filter_unidade_cras(self, queryset, name, value):
        return queryset.filter(unidade_inicial_id=value)
