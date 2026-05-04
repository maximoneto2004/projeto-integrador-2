import uuid
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("servicos", "0001_initial"),
        ("relatorios", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="ConfiguracaoRelatorioAtividadesCadunico",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Criado em"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Atualizado em"),
                ),
                ("is_active", models.BooleanField(default=True, verbose_name="Ativo")),
                (
                    "nome",
                    models.CharField(max_length=100, unique=True, verbose_name="Nome"),
                ),
                (
                    "bolsa_familia",
                    models.ManyToManyField(
                        blank=True,
                        related_name="configuracoes_relatorio_atividades_bolsa_familia",
                        to="servicos.servico",
                        verbose_name="Servicos de bolsa familia",
                    ),
                ),
                (
                    "cadastro_unico",
                    models.ManyToManyField(
                        blank=True,
                        related_name="configuracoes_relatorio_atividades_cadastro_unico",
                        to="servicos.servico",
                        verbose_name="Servicos de cadastro unico",
                    ),
                ),
            ],
            options={
                "verbose_name": "Configuracao do relatorio de atividades cadunico",
                "verbose_name_plural": "Configuracoes do relatorio de atividades cadunico",
            },
        ),
    ]
