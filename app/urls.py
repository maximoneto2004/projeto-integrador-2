from django.urls import path

from app.views import BairroListCreateView, BairroRetrieveUpdateDestroyView

urlpatterns = [
    path(
        "bairro/<uuid:pk>",
        BairroRetrieveUpdateDestroyView.as_view(),
        name="Bairro_RetrieveUpdateDestroy",
    ),
    path("bairro/", BairroListCreateView.as_view(), name="Bairro_ListCreate"),
]
