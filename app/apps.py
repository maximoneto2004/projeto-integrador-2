import os
import sys

from django.apps import AppConfig


EXCLUDED_COMMANDS = {
    "migrate",
    "makemigrations",
    "collectstatic",
    "shell",
    "test",
    "dumpdata",
    "loaddata",
}


class AppConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "app"

    def ready(self):
        if not self._should_start_scheduler():
            return

        try:
            from .scheduler import start_scheduler
            start_scheduler()
            # pass
        except Exception:
            import logging

            logging.getLogger(__name__).exception("Falha ao iniciar APScheduler")

    @staticmethod
    def _should_start_scheduler() -> bool:
        if os.environ.get("DISABLE_APSCHEDULER") == "1":
            return False

        if len(sys.argv) > 1:
            cmd = sys.argv[1]

            if cmd in EXCLUDED_COMMANDS:
                return False

            if cmd == "runserver" and os.environ.get("RUN_MAIN") != "true":
                return False

        return True
