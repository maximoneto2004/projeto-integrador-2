from datetime import time, timedelta

from django.contrib.auth.models import Group
from django.contrib.auth.hashers import make_password
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from agendamentos.models import Agendamento, AgendaVaga
from app.models import Bairro
from app.static_data import GRUPO_MEDICO
from cidadaos.models import Cidadao
from medicamentos.models import LoteMedicamento, Medicamento
from prontuario.models import Receita, ReceitaMedicamento
from servicos.models import ClasseServico, Servico, TipoServico
from unidade_posto.models import ServicoUnidadePosto, UnidadePosto
from usuarios.models import Usuario


class Command(BaseCommand):
    help = "Cria um conjunto pequeno, determinístico e idempotente de dados para testar a integração de IA."

    @transaction.atomic
    def handle(self, *args, **options):
        if not timezone.localtime().tzinfo:
            raise CommandError("Timezone local indisponível.")
        bairro, _ = Bairro.objects.get_or_create(nome="Bairro Dev IA")
        unidade, _ = UnidadePosto.objects.update_or_create(
            nome="Posto Dev IA",
            defaults={"logradouro": "Rua Fictícia", "numero": "100", "cep": "60000-000", "bairro": bairro, "telefone": "85999990000", "email": "posto.ia@example.test", "hora_manha_inicio": time(8), "hora_manha_fim": time(12), "hora_tarde_inicio": time(13), "hora_tarde_fim": time(17)},
        )
        classe, _ = ClasseServico.objects.get_or_create(nome="Saúde Dev IA")
        tipo_medico, _ = TipoServico.objects.get_or_create(nome="Consulta Médica Dev IA", defaults={"tempo_atendimento": 20})
        tipo_enfermagem, _ = TipoServico.objects.get_or_create(nome="Consulta Enfermagem Dev IA", defaults={"tempo_atendimento": 20})
        servico_medico, _ = Servico.objects.update_or_create(nome="Consulta médica Dev IA", defaults={"classe": classe, "tipo_servico": tipo_medico, "tipo_marcacao": "AGENDAMENTO", "gera_receita": True})
        servico_enfermagem, _ = Servico.objects.update_or_create(nome="Consulta de enfermagem Dev IA", defaults={"classe": classe, "tipo_servico": tipo_enfermagem, "tipo_marcacao": "AGENDAMENTO", "gera_receita": False})
        for servico in (servico_medico, servico_enfermagem):
            ServicoUnidadePosto.objects.update_or_create(unidade=unidade, servico=servico, defaults={"dias_semana": [1, 2, 3, 4, 5], "mesmo_expediente": True})

        cidadaos = []
        for nome, cpf, telefone in (
            ("Ana Fictícia da Silva", "52998224725", "85999990001"),
            ("Bruno Exemplo de Souza", "11144477735", "85999990002"),
            ("Carla Pessoa de Teste", "93541134780", "85999990003"),
        ):
            obj, _ = Cidadao.objects.update_or_create(cpf=cpf, defaults={"nome": nome, "telefone": telefone, "unidade_origem": unidade})
            cidadaos.append(obj)

        medico, created = Usuario.objects.get_or_create(
            email="medico.ia@example.test",
            defaults={"username": "medico.ia.dev", "nome_completo": "Médico Fictício IA", "cpf": "39053344705", "telefone": "85999990004", "password": make_password(None)},
        )
        medico.unidades_lotacao.add(unidade)
        grupo, _ = Group.objects.get_or_create(name=GRUPO_MEDICO)
        medico.groups.add(grupo)

        hoje = timezone.localdate()
        vaga_futura, _ = AgendaVaga.objects.get_or_create(unidade=unidade, tipo_servico=tipo_medico, data=hoje + timedelta(days=7), horario=time(9), defaults={"vagas": 3})
        futuro = Agendamento.objects.filter(cidadao=cidadaos[0], servico=servico_medico, situacao="AGENDADO").first()
        if not futuro:
            futuro = Agendamento.objects.create(cidadao=cidadaos[0], unidade=unidade, servico=servico_medico, vaga=vaga_futura, data=vaga_futura.data, horario=vaga_futura.horario, origem="SITE")
        vaga_cancelavel, _ = AgendaVaga.objects.get_or_create(unidade=unidade, tipo_servico=tipo_medico, data=hoje + timedelta(days=8), horario=time(10), defaults={"vagas": 3})
        cancelavel = Agendamento.objects.filter(cidadao=cidadaos[1], servico=servico_medico, situacao="AGENDADO").first()
        if not cancelavel:
            cancelavel = Agendamento.objects.create(cidadao=cidadaos[1], unidade=unidade, servico=servico_medico, vaga=vaga_cancelavel, data=vaga_cancelavel.data, horario=vaga_cancelavel.horario, origem="SITE")
        finalizado = Agendamento.objects.filter(cidadao=cidadaos[2], servico=servico_medico, situacao="FINALIZADO").first()
        if not finalizado:
            finalizado = Agendamento.objects.create(cidadao=cidadaos[2], unidade=unidade, servico=servico_medico, vaga=None, data=hoje - timedelta(days=2), horario=time(11), origem="FILA", situacao="AGUARDANDO_FILA", atendente=medico)
            for situacao in ("CHAMANDO", "ATENDIMENTO"):
                finalizado.situacao = situacao
                finalizado.save(update_fields=["situacao", "updated_at"])

        med_disponivel, _ = Medicamento.objects.get_or_create(nome="Medicamento Disponível Dev IA", concentracao="50", unidade_medida="MG", forma_farmaceutica="COMPRIMIDO", defaults={"principio_ativo": "Substância Fictícia A", "via_administracao": "ORAL"})
        med_indisponivel, _ = Medicamento.objects.get_or_create(nome="Medicamento Indisponível Dev IA", concentracao="20", unidade_medida="MG", forma_farmaceutica="COMPRIMIDO", defaults={"principio_ativo": "Substância Fictícia B", "via_administracao": "ORAL"})
        LoteMedicamento.objects.update_or_create(medicamento=med_disponivel, unidade=unidade, numero_lote="DEV-IA-001", defaults={"validade": hoje + timedelta(days=365), "quantidade_inicial": 25, "quantidade_atual": 25, "fornecedor": "Fornecedor Fictício"})
        LoteMedicamento.objects.update_or_create(medicamento=med_indisponivel, unidade=unidade, numero_lote="DEV-IA-002", defaults={"validade": hoje + timedelta(days=365), "quantidade_inicial": 0, "quantidade_atual": 0, "fornecedor": "Fornecedor Fictício"})
        receita, _ = Receita.objects.get_or_create(agendamento=finalizado, cidadao=cidadaos[2], defaults={"profissional": medico, "validade_dias": 30, "observacoes": "Receita de desenvolvimento da integração"})
        for med, dosagem in ((med_disponivel, "50 mg"), (med_indisponivel, "20 mg")):
            ReceitaMedicamento.objects.update_or_create(receita=receita, medicamento=med, defaults={"nome": med.nome, "dosagem": dosagem, "frequencia": "1x ao dia", "duracao": "7 dias", "quantidade_prescrita": 7})
        if finalizado.situacao == "ATENDIMENTO":
            finalizado.situacao = "FINALIZADO"
            finalizado.save(update_fields=["situacao", "updated_at"])

        self.stdout.write(self.style.SUCCESS("Dados IA dev prontos (idempotentes)."))
        self.stdout.write("Ana Fictícia da Silva: CPF 52998224725 / telefone 85999990001")
        self.stdout.write("Bruno Exemplo de Souza: CPF 11144477735 / telefone 85999990002")
        self.stdout.write("Carla Pessoa de Teste: CPF 93541134780 / telefone 85999990003")
