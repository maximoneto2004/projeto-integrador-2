from django.urls import path

from medicamentos.views import MedicamentoListCreateView, MedicamentoRetrieveUpdateDestroyView

urlpatterns = [
    path("medicamento/", MedicamentoListCreateView.as_view(), name="medicamento-list"),
    path(
        "medicamento/<uuid:pk>",
        MedicamentoRetrieveUpdateDestroyView.as_view(),
        name="medicamento-retrieve",
    ),
]
