import django_filters 
from .models import Avaliacao

class AvaliacaoFilters(django_filters.FilterSet):
  cidadao = django_filters.CharFilter(field_name="agendamento__cidadao_id")
  unidade = django_filters.CharFilter(field_name="agendamento__unidade_id")
  
  class Meta:
    model = Avaliacao
    fields = ["cidadao","unidade"]