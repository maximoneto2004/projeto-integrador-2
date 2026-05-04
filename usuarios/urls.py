from django.urls import path

from .views import DefinirGuicheAtualView, GroupListCreateView, GroupRetrieveUpdateDestroyView, GuicheAtualView, GuicheListCreateView, GuicheRetrieveUpdateView, GuichesDisponiveisView, LiberaGuicheView, UsuarioCreateListView, UsuarioRetrieveUpdateDestroyView, EscalaTrabalhoListCreateView, EscalaTrabalhoRetrieveUpdateDeleteView

urlpatterns = [
    path("guiches/", GuichesDisponiveisView.as_view(), name="guiches_disponiveis"),
    path("guiches/list/", GuicheListCreateView.as_view(), name="guiche_list_create"),
    path("guiches/<uuid:pk>/", GuicheRetrieveUpdateView.as_view(), name="guiche_update"),
    path("guiches/definir/",DefinirGuicheAtualView.as_view(),name="definir_guiche_atual",),
    path("guiches/atual/", GuicheAtualView.as_view(), name="guiche_atual"),
    path("guiches/liberar/", LiberaGuicheView.as_view(), name="liberar_guiche"),
    
    path("usuarios/", UsuarioCreateListView.as_view(), name="usuario_create_list"),
    path(
        "usuarios/<uuid:pk>/",
        UsuarioRetrieveUpdateDestroyView.as_view(),
        name="usuario_detail",
    ),
    path("usuarios/groups/", GroupListCreateView.as_view(), name="groups_list"),
    path(
        "usuarios/groups/<uuid:pk>/",
        GroupRetrieveUpdateDestroyView.as_view(),
        name="group_detail",
    ),
    path(
        "usuarios/escalas/",
        EscalaTrabalhoListCreateView.as_view(),
        name="escala_trabalho_list_create",
    ),
    path(
        "usuarios/escalas/<uuid:pk>/",
        EscalaTrabalhoRetrieveUpdateDeleteView.as_view(),
        name="escala_trabalho_detail",
    ),
]
