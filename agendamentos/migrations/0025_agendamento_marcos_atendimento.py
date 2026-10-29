from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("agendamentos", "0024_grupo_farmaceutico")]

    operations = [
        # O histórico fica intacto: não inventamos a data real de horários antigos.
        migrations.AddField(
            model_name="agendamento",
            name="inicio_atendimento_em",
            field=models.DateTimeField(blank=True, editable=False, null=True, verbose_name="Início do atendimento"),
        ),
        migrations.AddField(
            model_name="agendamento",
            name="fim_atendimento_em",
            field=models.DateTimeField(blank=True, editable=False, null=True, verbose_name="Fim do atendimento"),
        ),
    ]
