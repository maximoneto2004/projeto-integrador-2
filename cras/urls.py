"""
URL configuration for cras project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from django.conf import settings
from django.conf.urls.static import static


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", TemplateView.as_view(template_name="index.html"), name="frontend"),
    re_path(r"^sistema/.*$", TemplateView.as_view(template_name="index.html")),
    path("api/v1/", include("app.urls")),
    path("api/v1/", include("authentication.urls")),
    path("api/v1/", include("unidade_posto.urls")),
    path("api/v1/", include("cidadaos.urls")),
    path("api/v1/", include("usuarios.urls")),
    path("api/v1/", include("agendamentos.urls")),
    path("api/v1/", include("dashboard.urls")),
    path("api/v1/", include("fila_espera.urls")),

    path("api/v1/",include("duvidas_frequentes.urls")),
    path("api/prontuario/", include("prontuario.urls")),
    path("api/v1/", include("servicos.urls")),
    path("api/v1/", include("medicamentos.urls")),
    path("api/v1/integracao/", include("integracao.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)

urlpatterns.append(path("api/schema/", SpectacularAPIView.as_view(permission_classes=[]), name="schema"))
urlpatterns.append(
    path(
        "api/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema", permission_classes=[]),
        name="swagger-ui",
    )
)
urlpatterns.append(
    path(
        "api/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema", permission_classes=[]),
        name="redoc",
    )
)
