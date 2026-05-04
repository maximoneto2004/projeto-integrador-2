from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import (
    CustomTokenObtainPairView,
    LogoutView,
    CookieTokenRefreshView,
    PasswordResetRequestAPIView,
    PasswordResetConfirmAPIView,
)

urlpatterns = [
    path(
        "authentication/token/",
        CustomTokenObtainPairView.as_view(),
        name="token_obtain_pair",
    ),
    path(
        "authentication/token/refresh",
        CookieTokenRefreshView.as_view(),
        name="token_refresh",
    ),
    path("authentication/token/verify", TokenVerifyView.as_view(), name="token_verify"),
    path("authentication/token/logout", LogoutView.as_view(), name="token_logout"),
    path(
        "authentication/password-reset/",
        PasswordResetRequestAPIView.as_view(),
        name="password_reset_request",
    ),
    path(
        "authentication/password-reset/confirm/",
        PasswordResetConfirmAPIView.as_view(),
        name="password_reset_confirm",
    ),
]
