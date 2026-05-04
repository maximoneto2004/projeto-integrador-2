from django.urls import path
from .views import (
    BloqueioHorarioCreateListView,
    ServicoUnidadeCrasCreateListView,
    ServicoUnidadeCrasRetrieveUpdateDestroyView,
    UnidadeCrasMapaListView,
    UnidadeCrasMapaRetrieveView,
    UnidadeCrasCreateListView,
    UnidadeCrasRetrieveUpdateDestroyView,
    BloqueioHorarioRetrieveUpdateDestroyView,
)
from django.http import HttpResponse


def ping(request):
    return HttpResponse("OK")


urlpatterns = [
    path("mapa_unidades/", UnidadeCrasMapaListView.as_view(), name="mapa_unidades_list"),
    path("mapa_unidades/<uuid:pk>/", UnidadeCrasMapaRetrieveView.as_view(), name="mapa_unidades_detail"),
    path("unidade_cras_list/", UnidadeCrasCreateListView.as_view(), name="bairro_list"),
    path(
        "unidade_cras_list/<uuid:pk>/",
        UnidadeCrasRetrieveUpdateDestroyView.as_view(),
        name="unidade_cras_detail",
    ),
    path(
        "servico_unidade_cras/",
        ServicoUnidadeCrasCreateListView.as_view(),
        name="servico_unidade_cras_list",
    ),
    path(
        "servico_unidade_cras/<uuid:pk>/",
        ServicoUnidadeCrasRetrieveUpdateDestroyView.as_view(),
        name="servico_unidade_cras_detail",
    ),
    path(
        "bloqueio_horario/",
        BloqueioHorarioCreateListView.as_view(),
        name="bloqueio_horario_list",
    ),
    path(
        "bloqueio_horario/<uuid:pk>/",
        BloqueioHorarioRetrieveUpdateDestroyView.as_view(),
        name="bloqueio_horario_detail",
    ),
]
