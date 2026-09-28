from rest_framework import permissions

from app.static_data import GRUPO_ADMINISTRADOR


class DjangoModelPermissionsWithView(permissions.DjangoModelPermissions):
    perms_map = {
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": [],
        "POST": ["%(app_label)s.add_%(model_name)s"],
        "PUT": ["%(app_label)s.change_%(model_name)s"],
        "PATCH": ["%(app_label)s.change_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }


class EscritaSomenteAdministrador(permissions.BasePermission):
    message = "Somente o administrador pode alterar este cadastro."

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        user = request.user
        return bool(
            user
            and user.is_authenticated
            and (user.is_superuser or user.groups.filter(name__iexact=GRUPO_ADMINISTRADOR).exists())
        )
