from django.urls import path

from .views import (
    TelaAgendamentoView,
    ajax_carregar_tipos,
    ajax_carregar_vagas,
    ajax_carregar_servicos_por_tipo,
    CriarAgendamentoView,
)

urlpatterns = [
    path("", TelaAgendamentoView.as_view(), name="tela_agendamento"),
    path(
        "ajax/tipos/<uuid:unidade_id>/",
        ajax_carregar_tipos,
        name="ajax_carregar_tipos",
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
]
