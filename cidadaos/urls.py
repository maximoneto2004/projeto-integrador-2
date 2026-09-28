from django.urls import path

from cidadaos.views import (
    CidadaoListCreateView,
    CidadaoRetrieveUpdateDestroyView,
)

urlpatterns = [
    path("cidadaos/", CidadaoListCreateView.as_view(), name="cidadao_list_create"),
    path(
        "cidadao/<uuid:pk>/",
        CidadaoRetrieveUpdateDestroyView.as_view(),
        name="cidadao_detail_view",
    ),
]
