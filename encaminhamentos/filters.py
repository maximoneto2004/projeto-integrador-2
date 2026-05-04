import django_filters

from encaminhamentos.models import CodigoArea, Encaminhamento


class CodigoAreaFilter(django_filters.FilterSet):
    codigo = django_filters.NumberFilter(field_name="codigo")

    class Meta:
        model = CodigoArea
        fields = [ "codigo"]


class EncaminhamentoFilter(django_filters.FilterSet):
    agendamento = django_filters.UUIDFilter(field_name="agendamento_id")
   
    class Meta:
        model = Encaminhamento
        fields = [     
            "agendamento"
        ]
