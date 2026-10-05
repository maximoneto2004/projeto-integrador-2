from django.db import migrations

CODENAMES = ["view_lotemedicamento", "view_movimentacaoestoque"]


def _grupo_coordenador(Group):
    # O grupo é carregado em minúsculas (Collection/auth_groups.json); a busca ignora maiúsculas para não duplicá-lo.
    return Group.objects.filter(name__iexact="coordenador").first() or Group.objects.create(name="coordenador")


def atribuir_permissoes(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    _grupo_coordenador(Group).permissions.add(
        *Permission.objects.filter(content_type__app_label="medicamentos", codename__in=CODENAMES)
    )


def remover_permissoes(apps, schema_editor):
    Group = apps.get_model("auth", "Group")
    Permission = apps.get_model("auth", "Permission")
    grupo = Group.objects.filter(name__iexact="coordenador").first()
    if grupo:
        grupo.permissions.remove(
            *Permission.objects.filter(content_type__app_label="medicamentos", codename__in=CODENAMES)
        )


class Migration(migrations.Migration):

    dependencies = [
        ("medicamentos", "0004_permissoes_estoque"),
    ]

    operations = [
        migrations.RunPython(atribuir_permissoes, remover_permissoes),
    ]
