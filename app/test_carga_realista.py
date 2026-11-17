import io
import json
from datetime import date, time, timedelta

from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from agendamentos.models import AgendaVaga, Agendamento
from app.demo.realista import cns_provisorio
from app.validators import validate_CPF
from cidadaos.models import Cidadao
from fila_espera.models import FilaEspera
from medicamentos.models import LoteMedicamento, Medicamento, MovimentacaoEstoque
from prontuario.models import Receita, ReceitaMedicamento, RegistroAtendimento
from servicos.models import Servico
from unidade_posto.models import Guiche, UnidadePosto
from usuarios.models import Usuario

BASE = date(2026, 11, 25)


def cns_valido(cns):
    return len(cns) == 15 and sum(int(d) * (15 - i) for i, d in enumerate(cns)) % 11 == 0


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class CargaRealistaTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.options = dict(senha="senha-apresentacao", data_base=BASE, hora_referencia=time(10, 0), unidades=4,
                           cidadaos=160, agendamentos=700, hoje=48, dias=45, dias_futuros=7, fila=12, seed=7, json=True)
        saida = io.StringIO()
        call_command("carregar_dados_apresentacao", stdout=saida, **cls.options)
        cls.relatorio = json.loads(saida.getvalue())["carga"]

    def test_nenhum_texto_de_demonstracao_fica_visivel(self):
        textos = []
        textos += list(UnidadePosto.objects.values_list("nome", "logradouro", "email"))
        textos += list(Usuario.objects.values_list("nome_completo", "email"))
        textos += list(Cidadao.objects.values_list("nome", "logradouro", "mae"))
        textos += list(Servico.objects.values_list("nome"))
        textos += list(Medicamento.objects.values_list("nome"))
        textos += list(Guiche.objects.values_list("nome"))
        textos += list(LoteMedicamento.objects.values_list("numero_lote", "fornecedor"))
        textos += list(MovimentacaoEstoque.objects.values_list("motivo"))
        textos += list(Receita.objects.values_list("observacoes"))
        textos += list(ReceitaMedicamento.objects.values_list("frequencia", "duracao"))
        textos += list(RegistroAtendimento.objects.values_list("queixa_principal"))
        textos += list(Agendamento.objects.values_list("observacoes_gerais"))
        juntos = " ".join(str(v) for linha in textos for v in linha if v).lower()
        for proibido in ("demo", "sintétic", "fictíci", "pessoa 0", "teste"):
            self.assertNotIn(proibido, juntos)

    def test_documentos_validos_e_unicos(self):
        cpfs = list(Cidadao.objects.values_list("cpf", flat=True)) + list(Usuario.objects.values_list("cpf", flat=True))
        self.assertEqual(len(cpfs), len(set(cpfs)))
        for cpf in cpfs:
            validate_CPF(cpf)
        cns = [c for c in Cidadao.objects.values_list("cns", flat=True) if c]
        self.assertTrue(cns)
        self.assertTrue(all(cns_valido(c) for c in cns))
        import random
        self.assertTrue(cns_valido(cns_provisorio(random.Random(1))))

    def test_coerencia_clinica_dos_servicos(self):
        for ag in Agendamento.objects.filter(servico__nome__in=["Consulta Ginecológica", "Pré-natal - Consulta Médica"]):
            self.assertEqual(ag.cidadao.sexo, "FEMININO")
        for reg in RegistroAtendimento.objects.filter(cid="Z34.9"):
            self.assertEqual(reg.cidadao.sexo, "FEMININO")

    def test_dia_base_acompanha_a_hora_de_referencia(self):
        do_dia = Agendamento.objects.filter(data=BASE)
        self.assertTrue(do_dia.filter(horario__gt=time(10), situacao="AGENDADO").exists())
        self.assertFalse(do_dia.filter(horario__gt=time(10)).exclude(situacao__in=["AGENDADO", "FINALIZADO"]).exists())
        self.assertFalse(do_dia.filter(horario__lt=time(9), situacao__in=["AGENDADO", "ATIVADO", "CHAMANDO", "ATENDIMENTO"]).exists())
        self.assertTrue(do_dia.filter(situacao__in=["ATIVADO", "CHAMANDO", "ATENDIMENTO"]).exists())
        self.assertTrue(Agendamento.objects.filter(data__gt=BASE, situacao="AGENDADO").exists())
        self.assertFalse(Agendamento.objects.filter(data__gt=BASE).exclude(situacao="AGENDADO").exists())
        self.assertFalse(Agendamento.objects.filter(horario__hour=12).exists())

    def test_vagas_e_estoque_coerentes(self):
        for vaga in AgendaVaga.objects.all():
            vinculados = vaga.agendamentos.exclude(situacao__in=["CANCELADO_CRAS", "CANCELADO_CIDADAO", "AUSENCIA_CIDADAO"]).count()
            self.assertEqual(vaga.vagas_ocupadas, vinculados)
        for lote in LoteMedicamento.objects.prefetch_related("movimentacoes"):
            self.assertEqual(sum(m.quantidade for m in lote.movimentacoes.all()), lote.quantidade_atual)

    def test_reexecucao_e_aditiva(self):
        saida = io.StringIO()
        call_command("carregar_dados_apresentacao", stdout=saida, **self.options)
        self.assertEqual(sum(json.loads(saida.getvalue())["carga"]["novos"].values()), 0)

    def test_recarregar_troca_a_data_base_sem_duplicar(self):
        total = Agendamento.objects.count()
        nova = BASE + timedelta(days=3)
        saida = io.StringIO()
        call_command("carregar_dados_apresentacao", stdout=saida, **{**self.options, "data_base": nova, "recarregar": True})
        # Só a agenda futura varia (fins de semana mudam com a data); o histórico antigo saiu por inteiro.
        self.assertLess(abs(Agendamento.objects.count() - total), total * 0.1)
        self.assertEqual(UnidadePosto.objects.count(), 4)
        self.assertTrue(Agendamento.objects.filter(data=nova).exists())
        self.assertFalse(Agendamento.objects.filter(data__lt=nova - timedelta(days=45)).exists())
        self.assertFalse(Agendamento.objects.filter(data__gt=nova + timedelta(days=7)).exists())

    def test_remover_demo_preserva_a_carga_realista(self):
        call_command("carregar_demonstracao", stdout=io.StringIO(), senha="x", data_base=BASE, unidades=2,
                     cidadaos=20, agendamentos=60, fila=4, dias=10, seed=1, json=True)
        self.assertTrue(UnidadePosto.objects.filter(nome__startswith="[DEMO]").exists())
        realistas = Agendamento.objects.filter(unidade__nome__startswith="UAPS").count()
        call_command("carregar_dados_apresentacao", stdout=io.StringIO(), apenas_remover=False, remover_demo=True, **self.options)
        self.assertFalse(UnidadePosto.objects.filter(nome__startswith="[DEMO]").exists())
        self.assertFalse(Cidadao.objects.filter(nome__startswith="[DEMO]").exists())
        self.assertFalse(Usuario.objects.filter(nome_completo__startswith="[DEMO]").exists())
        self.assertFalse(Medicamento.objects.filter(nome__startswith="[DEMO]").exists())
        self.assertEqual(Agendamento.objects.filter(unidade__nome__startswith="UAPS").count(), realistas)

    def test_apenas_remover_limpa_a_carga(self):
        externo = Cidadao.objects.create(nome="Cadastro feito na apresentação", cpf="52998224725",
                                         unidade_origem=UnidadePosto.objects.first())
        call_command("carregar_dados_apresentacao", stdout=io.StringIO(), apenas_remover=True,
                     **{k: v for k, v in self.options.items() if k != "senha"})
        self.assertEqual(UnidadePosto.objects.count(), 0)
        self.assertEqual(Agendamento.objects.count(), 0)
        self.assertEqual(Usuario.objects.count(), 0)
        externo.refresh_from_db()
        self.assertIsNone(externo.unidade_origem)

    def test_paineis_respondem_com_os_logins_criados(self):
        logins = self.relatorio["logins"]
        client = APIClient()
        params = {"data_inicio": str(BASE - timedelta(days=45)), "data_fim": str(BASE)}
        client.force_authenticate(Usuario.objects.get(email=logins["gestor"]))
        mapa = client.get("/api/v1/mapa_unidades/", params)
        self.assertEqual(mapa.status_code, 200, mapa.content)
        self.assertEqual(len(mapa.json()["result"]), 4)
        client.force_authenticate(Usuario.objects.get(email=logins["supervisor"]))
        params["unidade_id"] = str(UnidadePosto.objects.get(nome="UAPS Centro").pk)
        resumo = client.get("/api/v1/dashboard-supervisor/", params)
        self.assertEqual(resumo.status_code, 200, resumo.content)
        self.assertTrue(all("@saudeperto.com.br" in e for e in logins.values()))


@override_settings(PASSWORD_HASHERS=["django.contrib.auth.hashers.MD5PasswordHasher"])
class HorarioEstendidoTests(TestCase):
    def test_expediente_estendido_e_retirada_perto_da_referencia(self):
        call_command("carregar_dados_apresentacao", stdout=io.StringIO(), senha="x", data_base=BASE,
                     hora_referencia=time(20, 40), fim_expediente=time(22), unidades=2, cidadaos=80,
                     agendamentos=300, hoje=60, dias=20, dias_futuros=3, fila=6, seed=3, json=True)
        self.assertTrue(UnidadePosto.objects.filter(hora_tarde_fim=time(22)).exists())
        self.assertTrue(Agendamento.objects.filter(data=BASE, horario__hour=21, situacao="AGENDADO").exists())
        for ag in Agendamento.objects.filter(data=BASE, situacao="AGUARDANDO_RETIRADA"):
            self.assertGreaterEqual(ag.horario, time(19, 0))
        for item in FilaEspera.objects.all():
            self.assertGreaterEqual(timezone.localtime(item.created_at).time(), time(19, 30))
