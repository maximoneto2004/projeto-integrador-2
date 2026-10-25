from django.urls import path

from cidadaos.views import (
    CidadaoListCreateView,
    CidadaoRetrieveUpdateDestroyView,
    ConfirmarVerificacaoView,
    IniciarVerificacaoView,
)
from cidadaos.views_cidadao import (
    CancelarMeuAgendamentoView,
    CidadaoMeusDadosView,
    DisponibilidadeReceitaView,
    MeusAgendamentosView,
    MinhaReceitaView,
    MinhasReceitasView,
)

urlpatterns = [
    path("cidadaos/", CidadaoListCreateView.as_view(), name="cidadao_list_create"),
    path(
        "cidadao/<uuid:pk>/",
        CidadaoRetrieveUpdateDestroyView.as_view(),
        name="cidadao_detail_view",
    ),
    path("cidadaos/verificacao/", IniciarVerificacaoView.as_view(), name="cidadao_verificacao_iniciar"),
    path(
        "cidadaos/verificacao/confirmar/",
        ConfirmarVerificacaoView.as_view(),
        name="cidadao_verificacao_confirmar",
    ),
    # Área do cidadão: exige o token devolvido na confirmação da verificação.
    path("cidadaos/eu/", CidadaoMeusDadosView.as_view(), name="cidadao_meus_dados"),
    path("cidadaos/eu/agendamentos/", MeusAgendamentosView.as_view(), name="cidadao_meus_agendamentos"),
    path(
        "cidadaos/eu/agendamentos/<uuid:pk>/cancelar/",
        CancelarMeuAgendamentoView.as_view(),
        name="cidadao_cancelar_agendamento",
    ),
    path("cidadaos/eu/receitas/", MinhasReceitasView.as_view(), name="cidadao_minhas_receitas"),
    path("cidadaos/eu/receitas/<uuid:pk>/", MinhaReceitaView.as_view(), name="cidadao_minha_receita"),
    path(
        "cidadaos/eu/receitas/<uuid:pk>/disponibilidade/",
        DisponibilidadeReceitaView.as_view(),
        name="cidadao_disponibilidade_receita",
    ),
]
