from django.core.management.base import BaseCommand
from django.utils.timezone import localdate
from datetime import timedelta

from usuarios.models import Usuario
from servicos.models import TipoServico
from unidade_cras.models import UnidadeCras, ServicoUnidadeCras
from app.gerar_grade import gerar_grade_tipo, salvar_grade_tipo

MAPA_DIAS_NUM = {
    1: "DOM",
    2: "SEG",
    3: "TER",
    4: "QUA",
    5: "QUI",
    6: "SEX",
    7: "SAB",
}


class Command(BaseCommand):
    help = "Gera e testa a grade de agendamento baseada em TIPO de serviço (D+1 e D+2)."

    def _datas_para_geracao(self, hoje):
        datas = [
            hoje + timedelta(days=1),
            hoje + timedelta(days=2),
        ]

        # Se for sexta-feira, inclui a segunda-feira da semana seguinte.
        if hoje.weekday() == 4:
            datas.append(hoje + timedelta(days=3))

        return sorted(set(datas))

    def handle(self, *args, **options):
        hoje = localdate()
        datas = self._datas_para_geracao(hoje)

        self.stdout.write("=== GERANDO VAGAS POR TIPO DE SERVIÇO ===\n")

        unidades = UnidadeCras.objects.filter(is_active=True)
        if not unidades.exists():
            self.stdout.write("Nenhuma Unidade CRAS encontrada.")
            return

        for unidade in unidades:
            self.stdout.write("\n----------------------------------------")
            self.stdout.write(f"UNIDADE CRAS: {unidade.nome}")
            self.stdout.write("----------------------------------------\n")

            # Carrega todos os serviços configurados na unidade
            su_list = ServicoUnidadeCras.objects.filter(unidade=unidade, is_active=True)
            if not su_list.exists():
                self.stdout.write("Nenhum serviço configurado para esta unidade.\n")
                continue

            # Descobrir todos os TIPOS atendidos nessa unidade
            tipos_ids = (
                su_list.values_list("servico__tipo_servico_id", flat=True).distinct()
            )
            tipos = TipoServico.objects.filter(id__in=tipos_ids, is_active=True)

            for tipo in tipos:

                self.stdout.write(f"\n🟦 Tipo de Serviço: {tipo.nome}")
                self.stdout.write(f"    - Tempo de atendimento: {tipo.tempo_atendimento} min")

                # Profissionais aptos ao tipo
                profissionais = Usuario.objects.filter(
                    is_active=True,
                    unidades_lotacao=unidade,
                    tipo_ofertados=tipo
                ).distinct()

                if not profissionais.exists():
                    self.stdout.write("    ⚠ Nenhum profissional atende este TIPO.")
                    continue

                self.stdout.write("    Profissionais aptos:")
                for p in profissionais:
                    self.stdout.write(f"        - {p.nome_completo}")

                # 🔥 SALVAR VAGAS PARA OS 2 DIAS
                for data in datas:
                    vagas = salvar_grade_tipo(unidade, tipo, data)

                    self.stdout.write(f"\n📅 Dia {data}:")
                    self.stdout.write(f"    💾 {len(vagas)} vagas salvas.")

                    grade = gerar_grade_tipo(unidade, tipo, data)

                    if not grade:
                        self.stdout.write("    ❌ Nenhuma vaga gerada.")
                        continue

                    self.stdout.write(f"    ✅ {len(grade)} horários encontrados:")
                    for item in grade:
                        self.stdout.write(
                            f"        - {item['horario']} "
                            f"(Profissional: {item['profissional']})"
                        )

        self.stdout.write("\n=== FIM ===\n")
