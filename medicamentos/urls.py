from django.urls import path

from medicamentos.views import (
    AlertasEstoqueView,
    DispensacaoView,
    LoteMedicamentoListCreateView,
    LoteMedicamentoRetrieveUpdateView,
    MedicamentoListCreateView,
    MedicamentoRetrieveUpdateDestroyView,
    MovimentacaoEstoqueListCreateView,
    SaldoEstoqueView,
)

urlpatterns = [
    path("medicamento/", MedicamentoListCreateView.as_view(), name="medicamento-list"),
    path(
        "medicamento/<uuid:pk>",
        MedicamentoRetrieveUpdateDestroyView.as_view(),
        name="medicamento-retrieve",
    ),
    path("estoque/lote/", LoteMedicamentoListCreateView.as_view(), name="estoque-lote-list"),
    path("estoque/lote/<uuid:pk>", LoteMedicamentoRetrieveUpdateView.as_view(), name="estoque-lote-retrieve"),
    path(
        "estoque/movimentacao/",
        MovimentacaoEstoqueListCreateView.as_view(),
        name="estoque-movimentacao-list",
    ),
    path("estoque/dispensar/", DispensacaoView.as_view(), name="estoque-dispensar"),
    path("estoque/saldo/", SaldoEstoqueView.as_view(), name="estoque-saldo"),
    path("estoque/alertas/", AlertasEstoqueView.as_view(), name="estoque-alertas"),
]
