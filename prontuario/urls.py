from django.urls import path

from prontuario.views import (
    DadosClinicosCidadaoView,
    ProntuarioCidadaoView,
    ReceitaListCreateView,
    ReceitaRetrieveUpdateDestroyView,
    RegistroAtendimentoListCreateView,
    RegistroAtendimentoRetrieveUpdateView,
)

urlpatterns = [
    path("receita/", ReceitaListCreateView.as_view(), name="receita-list"),
    path("receita/<uuid:pk>/", ReceitaRetrieveUpdateDestroyView.as_view(), name="receita-retrieve"),
    path("atendimento/", RegistroAtendimentoListCreateView.as_view(), name="registro-atendimento-list"),
    path(
        "atendimento/<uuid:pk>/",
        RegistroAtendimentoRetrieveUpdateView.as_view(),
        name="registro-atendimento-retrieve",
    ),
    path("cidadao/<uuid:cidadao_id>/", ProntuarioCidadaoView.as_view(), name="prontuario-cidadao"),
    path(
        "cidadao/<uuid:cidadao_id>/dados-clinicos/",
        DadosClinicosCidadaoView.as_view(),
        name="prontuario-dados-clinicos",
    ),
]
