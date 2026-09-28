from django.db import migrations


def reestruturar_grupos(apps, schema_editor):
    Group = apps.get_model("auth", "Group")

    atendente = Group.objects.filter(name="Atendente").first()
    if atendente:
        # Usuários que eram "Atendente" ficam como Médico; Enfermeiros devem ser reclassificados manualmente.
        atendente.name = "Médico"
        atendente.save(update_fields=["name"])
        enfermeiro, _ = Group.objects.get_or_create(name="Enfermeiro")
        enfermeiro.permissions.add(*atendente.permissions.all())
    else:
        Group.objects.get_or_create(name="Médico")
        Group.objects.get_or_create(name="Enfermeiro")

    Group.objects.filter(name__iexact="atendente 156").delete()
    Group.objects.filter(name__iexact="atendente do 156").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("usuarios", "0006_remove_usuario_cargo_funcao"),
        ("auth", "0012_alter_user_first_name_max_length"),
    ]

    operations = [
        migrations.RunPython(reestruturar_grupos, migrations.RunPython.noop),
    ]
