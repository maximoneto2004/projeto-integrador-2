from django.urls import path
from fila_espera.views import (
    FilaEsperaListCreateView,
    FilaEsperaRetrieveUpdatedDestroyView,
    FilaEsperaChamarProximoAPIView,
)

urlpatterns = [
    path(
        "fila-espera/",
        FilaEsperaListCreateView.as_view(),
        name="fila_espera_list_create",
    ),
    path(
        "fila-espera/<uuid:pk>/",
        FilaEsperaRetrieveUpdatedDestroyView.as_view(),
        name="fila_espera_detail_view",
    ),
    path(
        "fila-espera/chamar-proximo/",
        FilaEsperaChamarProximoAPIView.as_view(),
        name="fila_espera_chamar_proximo",
    ),
]
