from django.urls import path, include
from .views import FaleConoscoView, IndexView, login, logout_sso
from cidadaos.views import CompletarCadastroView
from cidadaos.requests_fd import login_sso
from app.views import BairroRetrieveUpdateDestroyView, BairroListCreateView

urlpatterns = [
    path(
        "bairro/<uuid:pk>",
        BairroRetrieveUpdateDestroyView.as_view(),
        name="Bairro_RetrieveUpdateDestroy",
    ),
    path("bairro/", BairroListCreateView.as_view(), name="Bairro_ListCreate"),
    path("fale-conosco/", FaleConoscoView.as_view(), name="Fale_Conosco"),
]
