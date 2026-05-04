from django.urls import path

from cidadaos.views import (
    CidadaoSSOUpsertView,
    CidadaoSSORetrieveView,
    SSORefreshTokenView,
    SSOProfileView,
    SSOFodLogoutView,
    SSOPessoaBaseView,
)


urlpatterns = [
    path("cidadaos/", CidadaoSSOUpsertView.as_view(), name="cidadao_sso_upsert"),
    path("cidadaos/me/", CidadaoSSORetrieveView.as_view(), name="cidadao_sso_me"),
    path("token/refresh/", SSORefreshTokenView.as_view(), name="sso_refresh_token"),
    path("perfil/", SSOProfileView.as_view(), name="sso_profile"),
    path("pessoa/<str:cpf>/base/", SSOPessoaBaseView.as_view(), name="sso_pessoa_base"),
    path("logout/", SSOFodLogoutView.as_view(), name="sso_fod_logout"),
]
