from django.apps import AppConfig


class IntegracaoConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "integracao"
    verbose_name = "Integração com agentes externos"

    def ready(self):
        from integracao import schema  # noqa: F401
