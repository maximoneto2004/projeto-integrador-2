from django.core.management.base import BaseCommand
from django.db.models import F
from tqdm import tqdm
import random

from servicos.models import Servico
from agendamentos.models import AgendaVaga, Agendamento
from cidadaos.models import Cidadao
from app.static_data import ORIGEM_CHOICES


class Command(BaseCommand):
    help = "Gera agendamentos FAKE usando cidadãos e vagas existentes"

    def add_arguments(self, parser):
        parser.add_argument(
            "--quantidade",
            type=int,
            default=1000,
            help="Quantidade máxima de agendamentos a gerar",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Remove agendamentos FAKE antes de gerar novamente",
        )

    def handle(self, *args, **options):
        qtd_agendamentos = options["quantidade"]
        reset = options["reset"]

        self.stdout.write(self.style.NOTICE("🚀 Iniciando seed de Agendamentos FAKE"))

        # --- RESET ---
        if reset:
            apagados = Agendamento.objects.filter(origem="FAKE").count()
            Agendamento.objects.filter(origem="FAKE").delete()
            self.stdout.write(
                self.style.WARNING(f"🧹 {apagados} agendamentos FAKE removidos")
            )

        # --- CIDADÃOS EXISTENTES ---
        cidadaos = list(Cidadao.objects.all())
        if not cidadaos:
            self.stdout.write(
                self.style.ERROR("❌ Nenhum cidadão encontrado no banco.")
            )
            return

        # --- VAGAS DISPONÍVEIS ---
        vagas = list(
            AgendaVaga.objects.filter(vagas_ocupadas__lt=F("vagas")).select_related(
                "unidade", "tipo_servico"
            )
        )

        if not vagas:
            self.stdout.write(self.style.ERROR("⚠️ Nenhuma vaga disponível."))
            return

        origens = [o[0] for o in ORIGEM_CHOICES]
        total_criados = 0

        # --- GERA AGENDAMENTOS ---
        for vaga in tqdm(vagas, desc="Criando agendamentos"):
            slots = vaga.vagas - vaga.vagas_ocupadas
            if slots <= 0:
                continue

            servico = (
                Servico.objects.filter(
                    tipo_servico=vaga.tipo_servico,
                    is_active=True,
                )
                .order_by("?")
                .first()
            )

            if not servico:
                continue

            for _ in range(slots):
                if total_criados >= qtd_agendamentos:
                    break

                cidadao = random.choice(cidadaos)

                try:
                    Agendamento.objects.create(
                        cidadao=cidadao,
                        unidade=vaga.unidade,
                        servico=servico,
                        vaga=vaga,
                        origem=random.choice(origens),
                    )
                    total_criados += 1

                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(
                            f"⚠️ Falha vaga {vaga.id} ({vaga.horario}): {e}"
                        )
                    )
                    break

        self.stdout.write(
            self.style.SUCCESS(
                f"✅ {total_criados} Agendamentos FAKE criados com sucesso!"
            )
        )
