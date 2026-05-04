from django.urls import path

from .views import (
    RelatorioAtendimentosTecnicoAPIView,
    RelatorioAtividadesCadunicoAPIView,
    RelatorioQuantitativoMensalAPIView,
)


urlpatterns = [
    path(
        "relatorios/atendimentos-tecnico/",
        RelatorioAtendimentosTecnicoAPIView.as_view(),
        name="relatorio-atendimentos-tecnico",
    ),
    path(
        "relatorios/atividades-cadunico/",
        RelatorioAtividadesCadunicoAPIView.as_view(),
        name="relatorio-atividades-cadunico",
    ),
    path(
        "relatorios/quantitativo-mensal/",
        RelatorioQuantitativoMensalAPIView.as_view(),
        name="relatorio-quantitativo-mensal",
    ),
]
