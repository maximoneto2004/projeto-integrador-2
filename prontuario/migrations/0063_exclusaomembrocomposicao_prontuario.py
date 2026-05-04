from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("prontuario", "0062_alter_exclusaomembrocomposicao_membro"),
    ]

    operations = [
        migrations.AddField(
            model_name="exclusaomembrocomposicao",
            name="prontuario",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=models.PROTECT,
                related_name="exclusoes_membros",
                to="prontuario.prontuario",
            ),
        ),
    ]
