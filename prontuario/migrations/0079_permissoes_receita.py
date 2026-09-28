from django.contrib.auth.management import create_permissions
from django.db import migrations

CRUD_RECEITA = [
    "add_receita",
    "change_receita",
    "delete_receita",
    "view_receita",
    "add_receitamedicamento",
    "change_receitamedicamento",
    "delete_receitamedicamento",
    "view_receitamedicamento",
]
CONSULTA_RECEITA = ["view_receita", "view_receitamedicamento"]

PERMISSOES_POR_GRUPO = {
    "Médico": CRUD_RECEITA,
    "Enfermeiro": CONSULTA_RECEITA,
    "Supervisor": CONSULTA_RECEITA,
    "administrador": CONSULTA_RECEITA,
}


def atribuir_permissoes(apps, schema_editor):
    # Permissões normalmente só são criadas no post_migrate; forçamos aqui para poder atribuí-las.
    app_config = apps.get_app_config("prontuario")
    app_config.models_module = True
    create_permissions(app_config, apps=apps, verbosity=0)
    app_config.models_module = None

    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    for nome_grupo, codenames in PERMISSOES_POR_GRUPO.items():
        grupo, _ = Group.objects.get_or_create(name=nome_grupo)
        grupo.permissions.add(
            *Permission.objects.filter(content_type__app_label="prontuario", codename__in=codenames)
        )


def remover_permissoes(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    for nome_grupo, codenames in PERMISSOES_POR_GRUPO.items():
        grupo = Group.objects.filter(name=nome_grupo).first()
        if grupo:
            grupo.permissions.remove(
                *Permission.objects.filter(content_type__app_label="prontuario", codename__in=codenames)
            )


class Migration(migrations.Migration):

    dependencies = [
        ("prontuario", "0078_receita_medicamento_estoque"),
        ("usuarios", "0007_reestruturar_grupos_saude"),
    ]

    operations = [
        migrations.RunPython(atribuir_permissoes, remover_permissoes),
    ]
