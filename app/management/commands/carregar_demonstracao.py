import json
import os
from datetime import date

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, connections
from django.utils import timezone

from app.demo.carga import CargaDemonstracao


class Command(BaseCommand):
    help = "Cria uma carga sintética aditiva com dashboards, receitas, estoque e logins dos oito perfis."

    def add_arguments(self, parser):
        parser.add_argument("--senha", default=os.environ.get("SAUDE_DEMO_PASSWORD"))
        parser.add_argument("--data-base", type=date.fromisoformat, default=timezone.localdate())
        parser.add_argument("--unidades", type=int, default=8)
        parser.add_argument("--cidadaos", type=int, default=400)
        parser.add_argument("--agendamentos", type=int, default=3000)
        parser.add_argument("--fila", type=int, default=80)
        parser.add_argument("--dias", type=int, default=90)
        parser.add_argument("--seed", type=int, default=42)
        parser.add_argument("--database", choices=list(connections), default="default")
        parser.add_argument("--json", action="store_true")

    def handle(self, *args, **options):
        if not options["senha"]:
            raise CommandError("Informe a senha de demonstração em SAUDE_DEMO_PASSWORD ou --senha.")
        if not 1 <= options["unidades"] <= 8 or options["dias"] < 1 or options["agendamentos"] < 0:
            raise CommandError("Use de 1 a 8 unidades, pelo menos 1 dia e quantidade não negativa de agendamentos.")
        if options["fila"] < 0 or options["cidadaos"] <= options["fila"]:
            raise CommandError("A quantidade de cidadãos deve ser maior que a fila, e a fila não pode ser negativa.")
        try:
            resultado = CargaDemonstracao(**{chave: options[chave] for chave in (
                "senha", "data_base", "unidades", "cidadaos", "agendamentos", "fila", "dias", "seed", "database",
            )}).executar()
        except IntegrityError as error:
            raise CommandError("A carga conflitou com cadastros existentes. A transação foi desfeita, sem sobrescrever registros.") from error
        if options["json"]:
            self.stdout.write(json.dumps(resultado, ensure_ascii=False))
        else:
            self.stdout.write(self.style.SUCCESS("Carga sintética gravada. Os registros existentes foram preservados."))
            for modelo, total in resultado["registros_da_carga"].items():
                self.stdout.write(f"{modelo}: {total} registros ({resultado['novos'].get(modelo, 0)} novos)")
            for perfil, email in resultado["logins"].items():
                self.stdout.write(f"{perfil}: {email}")
        return None
