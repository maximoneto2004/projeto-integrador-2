from django.contrib.auth.management import create_permissions
from django.db import migrations

CODENAMES = ["add_registroatendimento", "change_registroatendimento", "view_registroatendimento"]
GRUPOS = ["Médico", "Enfermeiro"]


def atribuir_permissoes(apps, schema_editor):
    # Permissões normalmente só são criadas no post_migrate; forçamos aqui para poder atribuí-las.
    app_config = apps.get_app_config("prontuario")
    app_config.models_module = True
    create_permissions(app_config, apps=apps, verbosity=0)
    app_config.models_module = None

    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    permissoes = Permission.objects.filter(content_type__app_label="prontuario", codename__in=CODENAMES)
    for nome in GRUPOS:
        grupo, _ = Group.objects.get_or_create(name=nome)
        grupo.permissions.add(*permissoes)


def remover_permissoes(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    permissoes = Permission.objects.filter(content_type__app_label="prontuario", codename__in=CODENAMES)
    for grupo in Group.objects.filter(name__in=GRUPOS):
        grupo.permissions.remove(*permissoes)


class Migration(migrations.Migration):

    dependencies = [
        ("prontuario", "0080_prontuario_clinico"),
        ("usuarios", "0007_reestruturar_grupos_saude"),
    ]

    operations = [
        migrations.RunPython(atribuir_permissoes, remover_permissoes),
    ]
