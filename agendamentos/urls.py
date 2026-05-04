from django.urls import path
from .views import (
    AgendaVagaListView,
    AgendamentoListCreateView,
    AgendamentoRetrieveUpdateView,
    AgendamentoAtivadoAusenteAPIView,
    AgendamentoCanceladoCrasAPIView,
    TelaAgendamentoView,
    ajax_carregar_tipos,
    ajax_carregar_vagas,
    ajax_carregar_servicos_por_tipo,
    CriarAgendamentoView,
    UltimasChamadasPainelAPIView,
)

urlpatterns = [
    path("", TelaAgendamentoView.as_view(), name="tela_agendamento"),
    path(
        "ajax/tipos/<uuid:unidade_id>/", ajax_carregar_tipos, name="ajax_carregar_tipos"
    ),
    path(
        "ajax/servicos/<uuid:unidade_id>/<uuid:tipo_id>/",
        ajax_carregar_servicos_por_tipo,
        name="ajax_carregar_servicos_por_tipo",
    ),
    path(
        "ajax/vagas/<uuid:unidade_id>/<uuid:tipo_id>/<str:data>/",
        ajax_carregar_vagas,
        name="ajax_carregar_vagas",
    ),
    path("ajax/agendar/", CriarAgendamentoView.as_view(), name="ajax_agendar"),
    path("vagas/", AgendaVagaListView.as_view(), name="lista_vagas"),
    path(
        "agendamentos/",
        AgendamentoListCreateView.as_view(),
        name="agendamento_list_create",
    ),
    path(
        "agendamentos/<uuid:pk>/",
        AgendamentoRetrieveUpdateView.as_view(),
        name="agendamento_detail",
    ),
    path(
        "<uuid:agendamento_id>/ativar-ausente/",
        AgendamentoAtivadoAusenteAPIView.as_view(),
        name="agendamento_ativado_ausente",
    ),
    path(
        "<uuid:agendamento_id>/cancelar-cras/",
        AgendamentoCanceladoCrasAPIView.as_view(),
        name="agendamento_cancelado_cras",
    ),
    path(
        "painel/ultimas-chamadas/",
        UltimasChamadasPainelAPIView.as_view(),
        name="painel_ultimas_chamadas",
    ),
]
