from django.urls import path

from .views import AgendamentoSSOCreateView, AgendamentoSSORetrieveUpdateView


urlpatterns = [
    path("agendamentos/", AgendamentoSSOCreateView.as_view(), name="agendamento_sso"),
    path(
        "agendamentos/<uuid:pk>/",
        AgendamentoSSORetrieveUpdateView.as_view(),
        name="agendamento_sso_update",
    ),
]
