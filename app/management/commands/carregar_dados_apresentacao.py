import json
import os
from datetime import date, datetime, time

from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, ProgrammingError, connections
from django.db.models import ProtectedError
from django.utils import timezone

from app.demo.realista import CargaRealista, remover_carga, remover_marcados_demo


def _hora(texto):
    return datetime.strptime(texto, "%H:%M").time()


class Command(BaseCommand):
    help = (
        "Popula a base com uma operação de aparência real (UAPS, profissionais, pacientes, agenda, prontuário, "
        "receitas e estoque) sem etiquetas [DEMO]. Os dados são fictícios e a carga é aditiva e reexecutável."
    )

    def add_arguments(self, parser):
        parser.add_argument("--senha", default=os.environ.get("SAUDE_APRESENTACAO_SENHA"),
                            help="Senha de todos os logins criados (ou variável SAUDE_APRESENTACAO_SENHA).")
        parser.add_argument("--dominio", default="saudeperto.com.br", help="Domínio dos e-mails de login e das unidades.")
        parser.add_argument("--data-base", type=date.fromisoformat, default=None,
                            help="Dia que aparece como 'hoje' nos painéis (AAAA-MM-DD). Padrão: hoje.")
        parser.add_argument("--hora-referencia", type=_hora, default=None,
                            help="Hora da apresentação (HH:MM): antes dela a agenda do dia está resolvida, depois está agendada.")
        parser.add_argument("--fim-expediente", type=_hora, default=time(17),
                            help="Fim do expediente das UAPS (HH:MM). Use 21:00 ou 22:00 para horário estendido.")
        parser.add_argument("--unidades", type=int, default=8)
        parser.add_argument("--cidadaos", type=int, default=1600)
        parser.add_argument("--agendamentos", type=int, default=9000)
        parser.add_argument("--hoje", type=int, default=200, help="Agendamentos no dia-base.")
        parser.add_argument("--dias", type=int, default=120, help="Dias de histórico.")
        parser.add_argument("--dias-futuros", type=int, default=14, help="Dias de agenda futura.")
        parser.add_argument("--fila", type=int, default=40)
        parser.add_argument("--seed", type=int, default=2026)
        parser.add_argument("--database", choices=list(connections), default="default")
        parser.add_argument("--remover-demo", action="store_true",
                            help="Apaga antes a carga antiga marcada com [DEMO].")
        parser.add_argument("--recarregar", action="store_true",
                            help="Apaga a carga realista anterior e grava de novo (use ao mudar a data-base).")
        parser.add_argument("--apenas-remover", action="store_true", help="Só apaga a carga realista, sem gravar.")
        parser.add_argument("--json", action="store_true")

    def handle(self, *args, **opts):
        hoje_local = timezone.localdate()
        data_base = opts["data_base"] or hoje_local
        hora = opts["hora_referencia"]
        if hora is None:
            hora = timezone.localtime().time().replace(second=0, microsecond=0) if data_base == hoje_local else time(10)
        if not opts["senha"] and not opts["apenas_remover"]:
            raise CommandError("Informe a senha dos logins em --senha ou na variável SAUDE_APRESENTACAO_SENHA.")
        if not 1 <= opts["unidades"] <= 8 or opts["dias"] < 1 or opts["agendamentos"] < opts["hoje"]:
            raise CommandError("Use de 1 a 8 unidades, pelo menos 1 dia e mais agendamentos do que os do dia-base.")
        if opts["fila"] < 0 or opts["cidadaos"] <= opts["fila"] * 2:
            raise CommandError("A quantidade de cidadãos deve ser bem maior que a fila.")

        carga = CargaRealista(
            senha=opts["senha"] or "-", data_base=data_base, unidades=opts["unidades"], cidadaos=opts["cidadaos"],
            agendamentos=opts["agendamentos"], fila=opts["fila"], dias=opts["dias"], seed=opts["seed"],
            database=opts["database"], dominio=opts["dominio"], hora_referencia=hora,
            agendamentos_no_dia=opts["hoje"], dias_futuros=opts["dias_futuros"], fim_expediente=opts["fim_expediente"],
        )
        saida = {}
        try:
            if opts["remover_demo"]:
                saida["removidos_demo"] = remover_marcados_demo(opts["database"])
            if opts["recarregar"] or opts["apenas_remover"]:
                unidades, usuarios, cidadaos, catalogo = carga.ids_da_carga()
                saida["removidos_carga_anterior"] = remover_carga(
                    db=opts["database"], unidades=unidades, usuarios=usuarios, cidadaos=cidadaos, catalogo=catalogo)
            if not opts["apenas_remover"]:
                saida["carga"] = carga.executar()
        except ProtectedError as error:
            raise CommandError(f"Há cadastros feitos à parte que dependem desta carga; nada foi apagado. Detalhe: {error}") from error
        except IntegrityError as error:
            raise CommandError(f"A carga conflitou com cadastros existentes e foi desfeita. Detalhe: {error}") from error
        except ProgrammingError as error:
            raise CommandError(f"Erro de banco (as migrações estão aplicadas?): {error}") from error

        if opts["json"]:
            self.stdout.write(json.dumps(saida, ensure_ascii=False, default=str))
            return
        for chave in ("removidos_demo", "removidos_carga_anterior"):
            if chave in saida:
                total = sum(saida[chave].values())
                self.stdout.write(self.style.WARNING(f"{chave.replace('_', ' ').capitalize()}: {total} registros"))
        if "carga" not in saida:
            return
        resultado = saida["carga"]
        self.stdout.write(self.style.SUCCESS(
            f"Carga gravada para {data_base:%d/%m/%Y}, hora de referência {hora:%H:%M}. Registros existentes preservados."))
        for modelo, total in sorted(resultado["registros_da_carga"].items()):
            self.stdout.write(f"  {modelo}: {total} ({resultado['novos'].get(modelo, 0)} novos)")
        self.stdout.write(self.style.SUCCESS("\nLogins (todos com a senha informada):"))
        for unidade, logins in resultado["logins_por_unidade"].items():
            self.stdout.write(f"  {unidade}")
            for perfil, email in logins.items():
                self.stdout.write(f"    {perfil:<14} {email}")
