import random
from datetime import date, datetime, time, timedelta

from django.contrib.auth.models import Group
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from agendamentos.models import AgendaVaga, Agendamento
from app.models import Bairro
from app.static_data import (
    DIA_SEMANA_CHOICES,
    ORIGEM_CHOICES,
    PRIORIDADE_CHOICES,
    STATUS_FINAL_ATENDIMENTO_CHOICES,
    URGENCIA_ATENDIMENTO_CHOICES,
)
from cidadaos.models import Cidadao
from fila_espera.models import FilaEspera
from servicos.catalogo_saude import TIPOS_POR_GRUPO
from servicos.models import Servico
from unidade_posto.models import Guiche, UnidadePosto
from usuarios.models import EscalaTrabalho, Usuario


class Command(BaseCommand):
    help = (
        "Popula dados para testes de dashboards/performance: profissionais, "
        "cidadaos, agendamentos historicos "
        "e fila de espera."
    )

    TAG = "[SEED_PERF]"

    def add_arguments(self, parser):
        parser.add_argument("--cidadaos", type=int, default=800)
        parser.add_argument("--profissionais-por-unidade", type=int, default=6)
        parser.add_argument("--agendamentos", type=int, default=3000)
        parser.add_argument("--fila-aguardando", type=int, default=800)
        parser.add_argument("--dias-passado", type=int, default=90)
        parser.add_argument("--vagas-por-slot", type=int, default=12)
        parser.add_argument("--seed", type=int, default=42)
        parser.add_argument(
            "--limpar",
            action="store_true",
            help="Remove dados criados por este comando (marcados com TAG).",
        )

    def handle(self, *args, **options):
        random.seed(options["seed"])

        if options["limpar"]:
            self._limpar()
            return

        unidades = list(UnidadePosto.objects.filter(is_active=True))
        servicos = list(Servico.objects.filter(is_active=True).select_related("tipo_servico"))
        if not unidades:
            self.stdout.write(self.style.ERROR("Nenhuma UnidadePosto ativa encontrada."))
            return
        if not servicos:
            self.stdout.write(self.style.ERROR("Nenhum Servico ativo encontrado."))
            return

        bairros = list(Bairro.objects.filter(is_active=True))
        if not bairros:
            bairros = [Bairro.objects.create(nome=f"{self.TAG} Bairro")]

        self.stdout.write(self.style.NOTICE("Criando profissionais/guiches/escalas..."))
        profissionais_por_unidade = self._criar_profissionais(
            unidades=unidades,
            servicos=servicos,
            por_unidade=options["profissionais_por_unidade"],
        )

        self.stdout.write(self.style.NOTICE("Criando vagas historicas..."))
        vagas = self._garantir_vagas_historicas(
            unidades=unidades,
            servicos=servicos,
            dias_passado=options["dias_passado"],
            vagas_por_slot=options["vagas_por_slot"],
        )

        self.stdout.write(self.style.NOTICE("Criando cidadaos..."))
        cidadaos = self._criar_cidadaos(
            quantidade=options["cidadaos"],
            unidades=unidades,
            bairros=bairros,
        )

        self.stdout.write(self.style.NOTICE("Criando agendamentos historicos completos..."))
        agendamentos = self._criar_agendamentos_historicos(
            quantidade=options["agendamentos"],
            cidadaos=cidadaos,
            servicos=servicos,
            vagas=vagas,
            profissionais_por_unidade=profissionais_por_unidade,
        )

        self.stdout.write(self.style.NOTICE("Criando fila de espera historica..."))
        qtd_fila = self._criar_fila_espera_historica(
            quantidade=options["fila_aguardando"],
            cidadaos=cidadaos,
            servicos=servicos,
            unidades=unidades,
            dias_passado=options["dias_passado"],
        )

        total_profissionais = sum(len(v) for v in profissionais_por_unidade.values())
        self.stdout.write(self.style.SUCCESS("Seed concluido com sucesso."))
        self.stdout.write(
            self.style.SUCCESS(
                f"Resumo: profissionais={total_profissionais}, cidadaos={len(cidadaos)}, "
                f"agendamentos={len(agendamentos)}, fila={qtd_fila}"
            )
        )

    def _criar_profissionais(self, unidades, servicos, por_unidade):
        dia_codigos = [d[0] for d in DIA_SEMANA_CHOICES if d[0] in {"SEG", "TER", "QUA", "QUI", "SEX"}]
        tipos_servico = list({s.tipo_servico for s in servicos if s.tipo_servico_id})
        tipos_por_nome = {t.nome: t for t in tipos_servico}

        for nome_grupo in ("Médico", "Enfermeiro", "Supervisor", "Gestor"):
            Group.objects.get_or_create(name=nome_grupo)

        profissionais_por_unidade = {}
        seq = 900000000

        with transaction.atomic():
            for idx_u, unidade in enumerate(unidades, start=1):
                guiches = list(unidade.guiches.all())
                while len(guiches) < 4:
                    guiches.append(
                        Guiche.objects.create(
                            unidade=unidade,
                            nome=f"{self.TAG} Guiche {idx_u}-{len(guiches) + 1}",
                        )
                    )

                profissionais = []
                total = max(1, por_unidade)
                for idx_p in range(total):
                    seq += 1
                    cpf = self._gerar_cpf_valido(seq)
                    email = f"seedperf_prof_{idx_u:03d}_{idx_p:03d}@example.local"
                    user = Usuario.objects.create_user(
                        email=email,
                        password="123456",
                        username=email,
                        nome_completo=f"{self.TAG} Profissional {idx_u:03d}-{idx_p:03d}",
                        cpf=cpf,
                        telefone=f"85{random.randint(10000000, 99999999)}",
                        is_active=True,
                    )
                    user.unidades_lotacao.add(unidade)
                    user.guiche_atual = random.choice(guiches)
                    user.save(update_fields=["guiche_atual"])

                    if idx_p == 0:
                        grupo = "Supervisor"
                    elif idx_p == 1:
                        grupo = "Gestor"
                    else:
                        grupo = "Médico" if idx_p % 2 == 0 else "Enfermeiro"
                    user.groups.add(Group.objects.get(name=grupo))

                    tipos_do_grupo = [tipos_por_nome[n] for n in TIPOS_POR_GRUPO.get(grupo, []) if n in tipos_por_nome]
                    if tipos_do_grupo:
                        user.tipo_ofertados.add(*tipos_do_grupo)
                    elif grupo != "Gestor":
                        # Catálogo de saúde não carregado: mantém o comportamento antigo de sortear tipos.
                        user.tipo_ofertados.add(*random.sample(tipos_servico, k=min(len(tipos_servico), random.randint(1, 3))))

                    EscalaTrabalho.objects.create(
                        profissional=user,
                        unidade=unidade,
                        dias_semana=dia_codigos,
                        turno1_inicio=time(8, 0),
                        turno1_fim=time(12, 0),
                        turno2_inicio=time(13, 0),
                        turno2_fim=time(17, 0),
                    )
                    profissionais.append(user)

                profissionais_por_unidade[str(unidade.id)] = profissionais

        return profissionais_por_unidade

    def _garantir_vagas_historicas(self, unidades, servicos, dias_passado, vagas_por_slot):
        hoje = timezone.localdate()
        horarios = [time(8, 0), time(9, 0), time(10, 0), time(11, 0), time(13, 0), time(14, 0), time(15, 0), time(16, 0)]
        tipos = list({s.tipo_servico for s in servicos if s.tipo_servico_id})
        vagas = []

        with transaction.atomic():
            for delta in range(1, dias_passado + 1):
                d = hoje - timedelta(days=delta)
                if d.weekday() >= 5:
                    continue
                for unidade in unidades:
                    for h in horarios:
                        tipo = random.choice(tipos)
                        vaga, created = AgendaVaga.objects.get_or_create(
                            unidade=unidade,
                            tipo_servico=tipo,
                            data=d,
                            horario=h,
                            defaults={"vagas": vagas_por_slot, "vagas_ocupadas": 0},
                        )
                        if not created and vaga.vagas < vagas_por_slot:
                            vaga.vagas = vagas_por_slot
                            vaga.save(update_fields=["vagas", "updated_at"])
                        vagas.append(vaga)
        return vagas

    def _criar_cidadaos(self, quantidade, unidades, bairros):
        origens = [o[0] for o in ORIGEM_CHOICES]
        alergias = [None, None, None, "Dipirona", "Penicilina", "Frutos do mar"]
        condicoes = [None, None, "Hipertensão", "Diabetes tipo 2", "Asma", "Hipertensão e diabetes tipo 2"]
        cidadaos = []
        inicio_cpf = 600000000

        with transaction.atomic():
            for idx in range(1, quantidade + 1):
                cpf = self._gerar_cpf_valido(inicio_cpf + idx)
                cidadaos.append(
                    Cidadao.objects.create(
                        nome=f"{self.TAG} Cidadao {idx:05d}",
                        cpf=cpf,
                        email=f"seedperf_{idx:05d}@example.local",
                        telefone=f"8599{random.randint(1000000, 9999999)}",
                        sexo=random.choice(["MASCULINO", "FEMININO"]),
                        data_nascimento=date(1950, 1, 1) + timedelta(days=random.randint(0, 25000)),
                        origem=random.choice(origens),
                        unidade_origem=random.choice(unidades),
                        bairro=random.choice(bairros),
                        logradouro=f"{self.TAG} Rua {idx}",
                        numero=str(random.randint(1, 9999)),
                        cep=f"60{random.randint(100, 999)}-{random.randint(100, 999)}",
                        alergias=random.choice(alergias),
                        condicoes_cronicas=random.choice(condicoes),
                    )
                )
        return cidadaos

    def _criar_agendamentos_historicos(self, quantidade, cidadaos, servicos, vagas, profissionais_por_unidade):
        status_pool = (
            ["FINALIZADO"] * 70
            + ["AUSENCIA_CIDADAO"] * 10
            + ["CANCELADO_CIDADAO"] * 8
            + ["CANCELADO_CRAS"] * 5
            + ["ATIVADO_AUSENTE"] * 4
            + ["ATENDIMENTO"] * 2
            + ["AGENDADO"] * 1
        )
        final_status_pool = [s[0] for s in STATUS_FINAL_ATENDIMENTO_CHOICES]
        tipos_por_servico = {}
        for servico in servicos:
            tipos_por_servico.setdefault(servico.tipo_servico_id, []).append(servico)

        vagas_disponiveis = []
        for vaga in vagas:
            restante = max(vaga.vagas - vaga.vagas_ocupadas, 0)
            if restante > 0:
                vagas_disponiveis.extend([vaga] * restante)

        random.shuffle(vagas_disponiveis)
        agendamentos = []

        with transaction.atomic():
            for vaga in vagas_disponiveis:
                if len(agendamentos) >= quantidade:
                    break

                candidatos = tipos_por_servico.get(vaga.tipo_servico_id) or []
                agendaveis = [s for s in candidatos if s.tipo_marcacao == "AGENDAMENTO"]
                if not agendaveis:
                    continue
                servico = random.choice(agendaveis)
                cidadao = random.choice(cidadaos)
                situacao = random.choice(status_pool)

                if situacao == "AGENDADO":
                    existe = Agendamento.objects.filter(
                        cidadao=cidadao,
                        servico=servico,
                        situacao="AGENDADO",
                    ).exists()
                    if existe:
                        situacao = "FINALIZADO"

                profissionais_unidade = profissionais_por_unidade.get(str(vaga.unidade_id), [])
                atendente = random.choice(profissionais_unidade) if profissionais_unidade else None

                inicio_dt = datetime.combine(vaga.data, vaga.horario) + timedelta(minutes=random.randint(1, 40))
                fim_dt = inicio_dt + timedelta(minutes=random.randint(12, 90))

                try:
                    ag = Agendamento.objects.create(
                        cidadao=cidadao,
                        atendente=atendente,
                        unidade=vaga.unidade,
                        servico=servico,
                        vaga=vaga,
                        situacao=situacao,
                        origem=random.choice([o[0] for o in ORIGEM_CHOICES]),
                        motivo_territorio=f"{self.TAG} Alocado fora do territorio para carga de testes.",
                        observacoes_gerais=f"{self.TAG} Agendamento historico para analise de dashboards.",
                        data_hora_inicio_atendimento=inicio_dt.time(),
                        data_hora_fim_atendimento=fim_dt.time(),
                        final_atendimento=random.choice(final_status_pool),
                    )

                    adicionais = [s for s in candidatos if s.id != servico.id]
                    if adicionais:
                        ag.servicos_adicionais.add(*random.sample(adicionais, k=min(len(adicionais), random.randint(1, 2))))

                    agendamentos.append(ag)
                except Exception:
                    continue

        return agendamentos

    def _criar_fila_espera_historica(self, quantidade, cidadaos, servicos, unidades, dias_passado):
        prioridades = [p[0] for p in PRIORIDADE_CHOICES]
        urgencias = [u[0] for u in URGENCIA_ATENDIMENTO_CHOICES]
        hoje = timezone.localdate()

        usados = set()
        criados = []

        with transaction.atomic():
            tentativas = max(quantidade * 20, 1000)
            for _ in range(tentativas):
                if len(criados) >= quantidade:
                    break

                cidadao = random.choice(cidadaos)
                servico = random.choice([s for s in servicos if s.tipo_marcacao == "AGENDAMENTO"] or servicos)
                unidade = random.choice(unidades)
                d = hoje - timedelta(days=random.randint(1, dias_passado))
                if d.weekday() >= 5:
                    continue

                chave = (str(cidadao.id), d.isoformat())
                if chave in usados:
                    continue

                fila = FilaEspera.objects.create(
                    cidadao=cidadao,
                    servico=servico,
                    unidade=unidade,
                    prioridade=random.choice(prioridades),
                    status="AGUARDANDO_FILA",
                    urgencia=random.choice(urgencias),
                )

                created_dt = timezone.make_aware(datetime.combine(d, time(random.randint(8, 16), random.randint(0, 59))))
                FilaEspera.objects.filter(pk=fila.pk).update(created_at=created_dt, updated_at=created_dt)
                criados.append(fila.pk)
                usados.add(chave)

        return len(criados)

    def _limpar(self):
        self.stdout.write(self.style.WARNING("Removendo dados marcados pelo seed..."))

        with transaction.atomic():
            FilaEspera.objects.filter(cidadao__nome__startswith=self.TAG).delete()

            ag_qs = Agendamento.objects.filter(observacoes_gerais__startswith=self.TAG)
            ag_qs.delete()

            Cidadao.objects.filter(nome__startswith=self.TAG).delete()

            EscalaTrabalho.objects.filter(profissional__email__startswith="seedperf_prof_").delete()
            Usuario.objects.filter(email__startswith="seedperf_prof_").delete()
            Guiche.objects.filter(nome__startswith=f"{self.TAG} Guiche").delete()

        self.stdout.write(self.style.SUCCESS("Limpeza concluida."))

    @staticmethod
    def _gerar_cpf_valido(base_int):
        n = str(base_int).zfill(9)[-9:]
        nums = [int(c) for c in n]

        s1 = sum(v * (10 - i) for i, v in enumerate(nums))
        d1 = (s1 * 10) % 11
        d1 = 0 if d1 == 10 else d1

        nums2 = nums + [d1]
        s2 = sum(v * (11 - i) for i, v in enumerate(nums2))
        d2 = (s2 * 10) % 11
        d2 = 0 if d2 == 10 else d2

        return f"{n}{d1}{d2}"
