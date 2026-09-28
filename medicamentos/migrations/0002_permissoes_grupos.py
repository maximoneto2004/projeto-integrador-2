from django.contrib.auth.management import create_permissions
from django.db import migrations

ACOES_POR_GRUPO = {
    "administrador": ["add", "change", "delete", "view"],
    "Médico": ["view"],
    "Enfermeiro": ["view"],
    "Supervisor": ["view"],
}


def atribuir_permissoes(apps, schema_editor):
    # Permissões normalmente só são criadas no post_migrate; forçamos aqui para poder atribuí-las.
    app_config = apps.get_app_config("medicamentos")
    app_config.models_module = True
    create_permissions(app_config, apps=apps, verbosity=0)
    app_config.models_module = None

    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")

    for nome_grupo, acoes in ACOES_POR_GRUPO.items():
        grupo, _ = Group.objects.get_or_create(name=nome_grupo)
        codenames = [f"{acao}_medicamento" for acao in acoes]
        grupo.permissions.add(
            *Permission.objects.filter(content_type__app_label="medicamentos", codename__in=codenames)
        )


def remover_permissoes(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    permissoes = Permission.objects.filter(content_type__app_label="medicamentos")
    for grupo in Group.objects.filter(name__in=ACOES_POR_GRUPO.keys()):
        grupo.permissions.remove(*permissoes)


class Migration(migrations.Migration):

    dependencies = [
        ("medicamentos", "0001_initial"),
        ("usuarios", "0007_reestruturar_grupos_saude"),
        ("auth", "0012_alter_user_first_name_max_length"),
        ("contenttypes", "0002_remove_content_type_name"),
    ]

    operations = [
        migrations.RunPython(atribuir_permissoes, remover_permissoes),
    ]
