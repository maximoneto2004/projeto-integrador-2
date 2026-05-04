from django.urls import path

from encaminhamentos.views import (
    CodigoAreaListCreateView,
    CodigoAreaRetrieveUpdateDestroyView,
    EncaminhamentoListCreateView,
    EncaminhamentoRetrieveUpdateDestroyView,
)

urlpatterns = [
    path(
        "codigo-area/",
        CodigoAreaListCreateView.as_view(),
        name="codigo_area_list_create",
    ),
    path(
        "codigo-area/<uuid:pk>/",
        CodigoAreaRetrieveUpdateDestroyView.as_view(),
        name="codigo_area_retrieve_update_destroy",
    ),
    path(
        "encaminhamento/",
        EncaminhamentoListCreateView.as_view(),
        name="encaminhamento_list_create",
    ),
    path(
        "encaminhamento/<uuid:pk>/",
        EncaminhamentoRetrieveUpdateDestroyView.as_view(),
        name="encaminhamento_retrieve_update_destroy",
    ),
]
