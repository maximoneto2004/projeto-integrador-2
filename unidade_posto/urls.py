from django.urls import path
from .views import (
    BloqueioHorarioCreateListView,
    ServicoUnidadePostoCreateListView,
    ServicoUnidadePostoRetrieveUpdateDestroyView,
    UnidadePostoMapaListView,
    UnidadePostoMapaRetrieveView,
    UnidadePostoCreateListView,
    UnidadePostoRetrieveUpdateDestroyView,
    BloqueioHorarioRetrieveUpdateDestroyView,
)
from django.http import HttpResponse


def ping(request):
    return HttpResponse("OK")


urlpatterns = [
    path("mapa_unidades/", UnidadePostoMapaListView.as_view(), name="mapa_unidades_list"),
    path("mapa_unidades/<uuid:pk>/", UnidadePostoMapaRetrieveView.as_view(), name="mapa_unidades_detail"),
    path("unidade_posto_list/", UnidadePostoCreateListView.as_view(), name="bairro_list"),
    path(
        "unidade_posto_list/<uuid:pk>/",
        UnidadePostoRetrieveUpdateDestroyView.as_view(),
        name="unidade_posto_detail",
    ),
    path(
        "servico_unidade_posto/",
        ServicoUnidadePostoCreateListView.as_view(),
        name="servico_unidade_posto_list",
    ),
    path(
        "servico_unidade_posto/<uuid:pk>/",
        ServicoUnidadePostoRetrieveUpdateDestroyView.as_view(),
        name="servico_unidade_posto_detail",
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
