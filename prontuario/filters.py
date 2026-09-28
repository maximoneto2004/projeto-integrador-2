import django_filters
from django.db.models import Q
from django.utils import timezone

from app.static_data import STATUS_DISPENSACAO_PARCIAL, STATUS_DISPENSACAO_PENDENTE
from .models import Receita, ReceitaMedicamento, RegistroAtendimento


class ReceitaFilter(django_filters.FilterSet):
    agendamento = django_filters.CharFilter(field_name="agendamento__id")
    cidadao = django_filters.CharFilter(field_name="cidadao__id")
    search = django_filters.CharFilter(method="filter_search")
    medicamento = django_filters.UUIDFilter(field_name="medicamentos__medicamento_id", distinct=True)
    vigente = django_filters.BooleanFilter(method="filter_vigente")
    pendente_dispensacao = django_filters.BooleanFilter(method="filter_pendente_dispensacao")

    def filter_vigente(self, queryset, name, value):
        hoje = timezone.localdate()
        return queryset.filter(data_validade__gte=hoje) if value else queryset.filter(data_validade__lt=hoje)

    def filter_pendente_dispensacao(self, queryset, name, value):
        com_item_pendente = ReceitaMedicamento.objects.filter(
            medicamento__isnull=False,
            status_dispensacao__in=[STATUS_DISPENSACAO_PENDENTE, STATUS_DISPENSACAO_PARCIAL],
        ).values("receita_id")
        return queryset.filter(id__in=com_item_pendente) if value else queryset.exclude(id__in=com_item_pendente)

    def filter_search(self, queryset, name, value):
        return queryset.filter(
            Q(cidadao__nome__icontains=value)
            | Q(cidadao__cpf__icontains=value)
            | Q(medicamentos__nome__icontains=value)
        ).distinct()

    class Meta:
        model = Receita
        fields = ["agendamento", "cidadao", "search", "medicamento", "vigente", "pendente_dispensacao"]


class RegistroAtendimentoFilter(django_filters.FilterSet):
    cidadao = django_filters.UUIDFilter(field_name="cidadao_id")
    agendamento = django_filters.UUIDFilter(field_name="agendamento_id")
    profissional = django_filters.UUIDFilter(field_name="profissional_id")
    data_inicio = django_filters.DateFilter(field_name="created_at", lookup_expr="date__gte")
    data_fim = django_filters.DateFilter(field_name="created_at", lookup_expr="date__lte")

    class Meta:
        model = RegistroAtendimento
        fields = ["cidadao", "agendamento", "profissional", "data_inicio", "data_fim"]
