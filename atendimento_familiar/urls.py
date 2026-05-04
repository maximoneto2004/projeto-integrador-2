from django.urls import path
from atendimento_familiar.views import (
    MembroFamiliarListCreateView,
    MembroFamiliarRetrieveUpdateDestroyView,
    FichaAtendimentoFamiliarListCreateView,
    FichaAtendimentoFamiliarRetrieveUpdateDestroyView,
)

urlpatterns = [
    path(
        "membro-familiar/",
        MembroFamiliarListCreateView.as_view(),
        name="membro_familiar_list_create",
    ),
    path(
        "membro-familiar/<uuid:pk>/",
        MembroFamiliarRetrieveUpdateDestroyView.as_view(),
        name="membro_familiar_detail_view",
    ),
    path(
        "ficha-atendimento/",
        FichaAtendimentoFamiliarListCreateView.as_view(),
        name="ficha_atendimento_familiar_list_create",
    ),
    path(
        "ficha-atendimento/<uuid:pk>/",
        FichaAtendimentoFamiliarRetrieveUpdateDestroyView.as_view(),
        name="ficha_atendimento_familiar_detail_view",
    ),
]
