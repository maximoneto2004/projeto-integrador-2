from django.urls import path

from .views import DjangoLogListView

urlpatterns = [
    path("logs/", DjangoLogListView.as_view(), name="django-log-list"),
]
