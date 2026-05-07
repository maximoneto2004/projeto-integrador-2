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
from cidadaos import requests_fd
from cidadaos.views import capturar_identidade


urlpatterns = [
    path("admin/", admin.site.urls),
    path("", TemplateView.as_view(template_name="index.html"), name="frontend"),
    path("", include("app.urls_web")),
    re_path(r"^sistema/.*$", TemplateView.as_view(template_name="index.html")),

    # Portal SPA routes (React Router)
    re_path(r"^(agendar(?:/.*)?|meus-agendamentos(?:/.*)?|perfil(?:/.*)?|cadastro-digital(?:/.*)?|duvidas-frequentes(?:/.*)?|unidades-cras(?:/.*)?|styleguide(?:/.*)?|teste(?:/.*)?|selo(?:/.*)?|validar-cadastro(?:/.*))$", TemplateView.as_view(template_name="index.html")),
    path("api/v1/", include("app.urls")),
    path("agendamentos/", include("agendamentos.web_urls")),
    path("api/v1/", include("authentication.urls")),
    path("api/v1/", include("unidade_cras.urls")),
    path("api/v1/", include("cidadaos.urls")),
    path("api/v1/", include("usuarios.urls")),
    path("api/v1/", include("agendamentos.urls")),
    path("api/v1/", include("dashboard.urls")),
    path("api/v1/", include("relatorios.urls")),
    path("api/v1/", include("fila_espera.urls")),
    
    path("api/v1/",include("duvidas_frequentes.urls")),
    path("api/v1/",include("historico.urls")),
    path("api/prontuario/", include("prontuario.urls")),
    path("api/v1/", include("atendimento_familiar.urls")),
    path("api/v1/", include("encaminhamentos.urls")),
    path("api/v1/",include("avaliacao.urls")),
    # esses endpoints são para o fortd
    path("auth-sso", requests_fd.check_auth_sso, name="auth_sso_root"),
    path("login-sso", requests_fd.login_sso, name="login_sso_root"),
    path("logout-sso", requests_fd.logout, name="logout_sso_root"),
    path("cidadao-identity", capturar_identidade, name="cidadao_identity_root"),
    path("api/v1/", include("servicos.urls")),
    path("api/sso/", include("cidadaos.urls_sso")),
    path("api/sso/", include("agendamentos.urls_sso")),
    path("api/sso/", include("avaliacao.urls_sso")),
]

"""
Em relação ao cidadao-identity é só uma rota que eu criei para o frontend 
conseguir pegar o perfil do cidadão que foi salvo na sessão depois do round-trip do fort digital, 
caso queira depois é só trazer no no login-sso sem problemas.

"""

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
