from django.urls import path

from cidadaos.views import (
    CidadaoListCreateView,
    CidadaoRetrieveUpdateDestroyView,
    capturar_identidade,
)
from cidadaos import requests_fd

urlpatterns = [
    path("cidadaos/", CidadaoListCreateView.as_view(), name="cidadao_list_create"),
    path(
        "cidadao/<uuid:pk>/",
        CidadaoRetrieveUpdateDestroyView.as_view(),
        name="cidadao_detail_view",
    ),
    path("auth-sso", requests_fd.check_auth_sso, name="auth_sso"),
    path("login-sso", requests_fd.login_sso, name="login_sso"),
    path("logout-sso", requests_fd.logout, name="logout_sso"),
    path(
        "cidadao-identity",
        capturar_identidade,
        name="cidadao_identity",
    ),
]
