from django.urls import path
from .views import (
  AvaliacaoSSOListCreateView,AvaliacaoSSORetrieveUpdateView
)

urlpatterns=[
  path("avaliacao/",AvaliacaoSSOListCreateView.as_view(),name="avalicao_sso"),
  path("avaliacao/<uuid:pk>/",AvaliacaoSSORetrieveUpdateView.as_view(),name="avaliacao_sso_update")
]