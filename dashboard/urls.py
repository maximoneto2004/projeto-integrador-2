from django.urls import path
from .supervisor import SupervisorAtendimentosAPIView
from .mapa_assistencial import MedicamentosMapaAPIView
from .views import (
    DashboardMonitorUnidadeAPIView,
    DashboardSupervisorAPIView,
    DashboardGestorAPIView,
    MapaUnidadesAPIView,
    MapaUnidadeSeriesAPIView,
    MapaBairrosGeojsonAPIView,
)

urlpatterns = [
    path("mapa/medicamentos/", MedicamentosMapaAPIView.as_view(), name="mapa_medicamentos"),
    path("dashboard-supervisor/atendimentos/", SupervisorAtendimentosAPIView.as_view(), name="dashboard_supervisor_atendimentos"),
    path(
        "dashboard-supervisor/",
        DashboardSupervisorAPIView.as_view(),
        name="dashboard_supervisor",
    ),
    path(
        "dashboard-gestor/", DashboardGestorAPIView.as_view(), name="dashboard-gestor"
    ),
    path("dashboard-monitor-unidade/", DashboardMonitorUnidadeAPIView.as_view(), name="dashboard_monitor_unidade"),
    path("mapa/unidades/", MapaUnidadesAPIView.as_view(), name="mapa_unidades"),
    path("mapa/unidades/series/", MapaUnidadeSeriesAPIView.as_view(), name="mapa_unidade_series"),
    path("mapa/bairros.geojson", MapaBairrosGeojsonAPIView.as_view(), name="mapa_bairros_geojson"),
    # path(
    #     "dashboard-atendente/",
    #     DashboardAtendenteAPIView.as_view(),
    #     name="dashboard_atendente",
    # ),
]
