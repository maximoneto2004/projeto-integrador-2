from django.contrib.auth.management import create_permissions
from django.db import migrations

PERMISSOES_POR_GRUPO = {
    "Supervisor": [
        "add_lotemedicamento",
        "change_lotemedicamento",
        "view_lotemedicamento",
        "add_movimentacaoestoque",
        "view_movimentacaoestoque",
    ],
    "administrador": ["view_lotemedicamento", "view_movimentacaoestoque"],
    "Médico": ["view_lotemedicamento"],
    "Enfermeiro": ["view_lotemedicamento"],
}


def atribuir_permissoes(apps, schema_editor):
    # Permissões normalmente só são criadas no post_migrate; forçamos aqui para poder atribuí-las.
    app_config = apps.get_app_config("medicamentos")
    app_config.models_module = True
    create_permissions(app_config, apps=apps, verbosity=0)
    app_config.models_module = None

    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    for nome_grupo, codenames in PERMISSOES_POR_GRUPO.items():
        grupo, _ = Group.objects.get_or_create(name=nome_grupo)
        grupo.permissions.add(
            *Permission.objects.filter(content_type__app_label="medicamentos", codename__in=codenames)
        )


def remover_permissoes(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    for nome_grupo, codenames in PERMISSOES_POR_GRUPO.items():
        grupo = Group.objects.filter(name=nome_grupo).first()
        if grupo:
            grupo.permissions.remove(
                *Permission.objects.filter(content_type__app_label="medicamentos", codename__in=codenames)
            )


class Migration(migrations.Migration):

    dependencies = [
        ("medicamentos", "0003_estoque"),
        ("medicamentos", "0002_permissoes_grupos"),
    ]

    operations = [
        migrations.RunPython(atribuir_permissoes, remover_permissoes),
    ]
