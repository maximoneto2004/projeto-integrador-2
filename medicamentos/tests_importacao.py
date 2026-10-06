import csv
from io import StringIO
from pathlib import Path
from tempfile import TemporaryDirectory
import uuid

from django.conf import settings
from django.core.exceptions import FieldDoesNotExist
from django.core.management import call_command
from django.test import SimpleTestCase, TestCase

from medicamentos.importacao import (
    inferir_via_administracao,
    normalizar_concentracao,
    normalizar_forma_farmaceutica,
)
from medicamentos.models import Medicamento
from medicamentos.serializers import MedicamentoSerializer


COLUNAS = [
    "id",
    "nome",
    "principio_ativo",
    "forma_farmaceutica",
    "concentracao",
    "financiamento",
    "grupo",
    "codigo_atc",
    "controlado",
    "ativo",
    "observacoes",
    "criado_em",
    "atualizado_em",
]


class NormalizacaoMedicamentoTests(SimpleTestCase):
    def test_model_e_api_nao_expoem_campos_exclusivos_do_csv(self):
        for campo in ("grupo", "financiamento", "codigo_atc"):
            with self.subTest(campo=campo):
                with self.assertRaises(FieldDoesNotExist):
                    Medicamento._meta.get_field(campo)
                self.assertNotIn(campo, MedicamentoSerializer.Meta.fields)

    def test_csv_e_relatorio_estao_protegidos_pelo_gitignore(self):
        regras = (Path(settings.BASE_DIR) / ".gitignore").read_text(encoding="utf-8").splitlines()
        self.assertIn("medicamentos.csv", regras)
        self.assertIn("importacao_medicamentos_pendencias.csv", regras)

    def test_normaliza_variacoes_de_forma(self):
        casos = {
            "comprimido revestido": "COMPRIMIDO",
            "comprimido de liberação prolongada": "COMPRIMIDO",
            "cápsula dura": "CAPSULA",
            "pó para solução injetável": "PO_SOLUCAO_INJETAVEL",
            "comprimido orodispersível": "COMPRIMIDO_ORODISPERSIVEL",
            "comprimido solúvel": "COMPRIMIDO_SOLUVEL",
            "creme vaginal": "CREME_VAGINAL",
            "160 mm x 49 mm": "PRESERVATIVO_160X49",
            "solução oftálmica": "COLIRIO",
            "dispositivo intrauterino (DIU)": "OUTRO",
        }
        for entrada, esperado in casos.items():
            with self.subTest(entrada=entrada):
                self.assertEqual(normalizar_forma_farmaceutica(entrada), esperado)

    def test_extrai_concentracao_e_unidade(self):
        casos = {
            "500 mg": ("500", "MG"),
            "150 mg/ml": ("150", "MG_ML"),
            "0,5 mg": ("0.5", "MG"),
            "1.000 UI": ("1000", "UI"),
            "5.000.000 UI": ("5000000", "UI"),
            "2%": ("2", "PERCENTUAL"),
            "20 µg": ("20", "MCG"),
        }
        for entrada, esperado in casos.items():
            with self.subTest(entrada=entrada):
                resultado = normalizar_concentracao(entrada)
                self.assertEqual((resultado.concentracao, resultado.unidade_medida), esperado)
                self.assertFalse(resultado.ambigua)

    def test_preserva_concentracao_composta_sem_inventar_unidade(self):
        entrada = "2% (20 mg/g)"
        resultado = normalizar_concentracao(entrada)
        self.assertEqual(resultado.concentracao, entrada)
        self.assertEqual(resultado.unidade_medida, "NAO_SE_APLICA")
        self.assertTrue(resultado.ambigua)

    def test_infere_via_somente_quando_segura(self):
        self.assertEqual(inferir_via_administracao("comprimido"), "ORAL")
        self.assertEqual(inferir_via_administracao("solução oftálmica"), "OFTALMICA")
        self.assertEqual(inferir_via_administracao("creme vaginal"), "VAGINAL")
        self.assertEqual(inferir_via_administracao("solução injetável"), "NAO_INFORMADA")
        self.assertEqual(inferir_via_administracao("implante"), "NAO_INFORMADA")


class ImportacaoMedicamentoTests(TestCase):
    def setUp(self):
        self.tempdir = TemporaryDirectory()
        self.addCleanup(self.tempdir.cleanup)
        self.arquivo = Path(self.tempdir.name) / "catalogo.csv"

    def _linha(self, **alteracoes):
        linha = {
            "id": str(uuid.uuid4()),
            "nome": "dipirona",
            "principio_ativo": "dipirona monoidratada",
            "forma_farmaceutica": "comprimido revestido",
            "concentracao": "500 mg",
            "financiamento": "básico e estratégico",
            "grupo": "1b",
            "codigo_atc": "N02BB02",
            "controlado": "False",
            "ativo": "True",
            "observacoes": "Observação de origem",
            "criado_em": "2026-09-28 22:32:26.050085",
            "atualizado_em": "2026-09-28 22:32:26.050085",
        }
        linha.update(alteracoes)
        return linha

    def _gravar(self, linhas):
        with self.arquivo.open("w", encoding="utf-8", newline="") as arquivo:
            escritor = csv.DictWriter(arquivo, fieldnames=COLUNAS)
            escritor.writeheader()
            escritor.writerows(linhas)

    def test_dry_run_nao_escreve_no_banco(self):
        self._gravar([self._linha()])
        saida = StringIO()
        call_command("importar_medicamentos", arquivo=str(self.arquivo), dry_run=True, stdout=saida)
        self.assertEqual(Medicamento.objects.count(), 0)
        self.assertIn("CRIARIAM: 1", saida.getvalue())
        self.assertIn("DRY-RUN", saida.getvalue())

    def test_importacao_e_idempotente_e_ignora_campos_sem_correspondencia(self):
        self._gravar([self._linha()])
        call_command("importar_medicamentos", arquivo=str(self.arquivo), stdout=StringIO())
        call_command("importar_medicamentos", arquivo=str(self.arquivo), stdout=StringIO())

        self.assertEqual(Medicamento.objects.count(), 1)
        medicamento = Medicamento.objects.get()
        self.assertEqual(medicamento.forma_farmaceutica, "COMPRIMIDO")
        self.assertEqual(medicamento.concentracao, "500")
        self.assertEqual(medicamento.unidade_medida, "MG")
        self.assertEqual(medicamento.estoque_minimo, 0)
        self.assertIsNone(medicamento.classe_terapeutica)
        self.assertIsNone(medicamento.fabricante)
        self.assertIsNone(medicamento.codigo_registro)

    def test_duplicidade_apos_normalizacao_e_ignorada_e_reportada(self):
        self._gravar(
            [
                self._linha(),
                self._linha(id=str(uuid.uuid4()), forma_farmaceutica="comprimido"),
            ]
        )
        saida = StringIO()
        call_command("importar_medicamentos", arquivo=str(self.arquivo), stdout=saida)
        self.assertEqual(Medicamento.objects.count(), 1)
        self.assertIn("POSSÍVEIS DUPLICIDADES: 1 linhas em 1 chaves", saida.getvalue())

        relatorio = self.arquivo.with_name("importacao_medicamentos_pendencias.csv")
        self.assertTrue(relatorio.exists())
        self.assertIn("Chave natural duplicada", relatorio.read_text(encoding="utf-8-sig"))

    def test_apresentacoes_antes_colidentes_continuam_distintas(self):
        grupos = [
            ("pó para solução injetável", "solução injetável"),
            ("pó para suspensão injetável", "suspensão injetável"),
            ("comprimido", "comprimido orodispersível", "comprimido solúvel", "comprimido de liberação retardada"),
            ("creme", "creme vaginal"),
            ("goma de mascar", "pastilha"),
            ("solução injetável 5 ml", "solução injetável 10 ml", "solução injetável 100 ml", "solução injetável 500 ml"),
            ("160 mm x 49 mm", "160 mm x 52 mm"),
        ]
        for grupo in grupos:
            with self.subTest(grupo=grupo):
                formas = [normalizar_forma_farmaceutica(forma) for forma in grupo]
                self.assertEqual(len(formas), len(set(formas)))
