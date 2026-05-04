from django.urls import path
from avaliacao.views import(
  AvaliacaoRetrieveUpdateDestroyView,AvaliacaoListCreateView
)

urlpatterns =[
  path("avaliacao/",AvaliacaoListCreateView.as_view(),name="avalicao-listCreate"),
  path("avaliacao/<uuid:pk>/",AvaliacaoRetrieveUpdateDestroyView.as_view(),name="avaliacao=retriveUpdateDestroy")
]