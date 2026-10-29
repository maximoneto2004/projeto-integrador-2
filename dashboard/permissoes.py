"""Quem pode ver os indicadores da rede inteira (Gestor, Monitor e Mapa)."""

from django.db.models import Q
from rest_framework import permissions

from app.static_data import GRUPO_ADMINISTRADOR, GRUPO_GESTOR


def pode_ver_gestao(user):
    return bool(user and user.is_authenticated and (
        user.is_superuser or user.groups.filter(
            Q(name__iexact=GRUPO_GESTOR) | Q(name__iexact=GRUPO_ADMINISTRADOR) | Q(name__iexact="admin")
        ).exists()
    ))


class GestaoPermission(permissions.BasePermission):
    message = "Somente o gestor ou o administrador podem ver os indicadores da rede."

    def has_permission(self, request, view):
        return pode_ver_gestao(request.user)
