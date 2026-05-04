from django.urls import path
from duvidas_frequentes.views import (DuvidaPerguntaListCreateView,DuvidaPerguntaRetrieveUpdateDestroyView)

urlpatterns=[
  path("duvida/", DuvidaPerguntaListCreateView.as_view(),name="Duvida-ListCreate"),
  path("duvida/<uuid:pk>/",DuvidaPerguntaRetrieveUpdateDestroyView.as_view(),name="Duvida-RetrieveUpdate")
]
