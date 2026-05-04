from django.urls import path, include
from .views import IndexView, login, logout_sso
from cidadaos.views import CompletarCadastroView
from cidadaos.requests_fd import login_sso
from app.views import BairroRetrieveUpdateDestroyView, BairroListCreateView

urlpatterns = [
    path("admin/", IndexView.as_view(), name="index"),
    path("login/", login, name="login"),
    # path("login-sso", login_sso, name="login_sso"),
    path(
        "completar-cadastro/",
        CompletarCadastroView.as_view(),
        name="completar_cadastro",
    ),
    path("logout_sso", logout_sso, name="logout_sso"),
]
