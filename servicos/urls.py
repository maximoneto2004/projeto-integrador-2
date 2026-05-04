from django.urls import path
from servicos.views import (
    ServicoListCreateApiView,
    ServicoRetriveUpdatedDestroyView,
    ClasseServicoListCreate,
    ClasseServicoRetriveUpdatedDestroyView,
    TipoServicoListCreate,
    TipoServicoRetrieveUpdatedDestroyView,
)

urlpatterns = [
    path("servico/", ServicoListCreateApiView.as_view(), name="servico-ListCreate"),
    path(
        "servico/<uuid:pk>",
        ServicoRetriveUpdatedDestroyView.as_view(),
        name="servico-Retrieve",
    ),
    path(
        "classe-servico/", ClasseServicoListCreate.as_view(), name="classe-servico-list"
    ),
    path(
        "classe-servico/<uuid:pk>",
        ClasseServicoRetriveUpdatedDestroyView.as_view(),
        name="classe-servico-retrieve",
    ),
    path("tipo-servico/", TipoServicoListCreate.as_view(), name="tipo-servico-list"),
    path(
        "tipo-servico/<uuid:pk>",
        TipoServicoRetrieveUpdatedDestroyView.as_view(),
        name="tipo-servico-retrieve",
    ),
]
