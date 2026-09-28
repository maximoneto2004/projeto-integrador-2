from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework.test import APIClient

from medicamentos.models import Medicamento
from usuarios.models import Usuario

URL_LISTA = "/api/v1/medicamento/"

PAYLOAD = {
    "nome": "Dipirona",
    "principio_ativo": "Dipirona sódica",
    "forma_farmaceutica": "COMPRIMIDO",
    "concentracao": "500",
    "unidade_medida": "MG",
    "via_administracao": "ORAL",
}


def criar_usuario(email, cpf, grupo=None):
    user = Usuario.objects.create_user(
        email=email,
        password="senha-teste",
        username=email,
        nome_completo=email,
        cpf=cpf,
        telefone="85999999999",
    )
    if grupo:
        user.groups.add(Group.objects.get(name=grupo))
    return user


class MedicamentoPermissoesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.admin = criar_usuario("admin@teste.local", "52998224725", "administrador")
        self.medico = criar_usuario("medico@teste.local", "11144477735", "Médico")
        self.sem_grupo = criar_usuario("semgrupo@teste.local", "39053344705")

    def test_administrador_cria_medicamento(self):
        self.client.force_authenticate(self.admin)
        resp = self.client.post(URL_LISTA, PAYLOAD, format="json")
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(Medicamento.objects.count(), 1)

    def test_medico_lista_mas_nao_cria(self):
        Medicamento.objects.create(**PAYLOAD)
        self.client.force_authenticate(self.medico)

        self.assertEqual(self.client.get(URL_LISTA).status_code, 200)

        resp = self.client.post(URL_LISTA, {**PAYLOAD, "concentracao": "1"}, format="json")
        self.assertEqual(resp.status_code, 403)

    def test_medico_nao_edita_nem_exclui(self):
        med = Medicamento.objects.create(**PAYLOAD)
        self.client.force_authenticate(self.medico)
        url = f"{URL_LISTA[:-1]}/{med.id}"

        self.assertEqual(self.client.patch(url, {"nome": "X"}, format="json").status_code, 403)
        self.assertEqual(self.client.delete(url).status_code, 403)
        self.assertTrue(Medicamento.objects.filter(pk=med.pk).exists())

    def test_usuario_sem_grupo_nao_lista(self):
        self.client.force_authenticate(self.sem_grupo)
        self.assertEqual(self.client.get(URL_LISTA).status_code, 403)

    def test_anonimo_nao_lista(self):
        self.assertIn(self.client.get(URL_LISTA).status_code, (401, 403))


class MedicamentoValidacaoTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.client.force_authenticate(criar_usuario("admin@teste.local", "52998224725", "administrador"))

    def test_apresentacao_duplicada_rejeitada(self):
        self.assertEqual(self.client.post(URL_LISTA, PAYLOAD, format="json").status_code, 201)
        resp = self.client.post(URL_LISTA, PAYLOAD, format="json")
        self.assertEqual(resp.status_code, 400)

    def test_mesma_substancia_outra_concentracao_permitida(self):
        self.client.post(URL_LISTA, PAYLOAD, format="json")
        resp = self.client.post(URL_LISTA, {**PAYLOAD, "concentracao": "1", "unidade_medida": "G"}, format="json")
        self.assertEqual(resp.status_code, 201, resp.content)

    def test_codigo_registro_vazio_vira_null(self):
        self.client.post(URL_LISTA, {**PAYLOAD, "codigo_registro": ""}, format="json")
        resp = self.client.post(
            URL_LISTA, {**PAYLOAD, "concentracao": "1", "unidade_medida": "G", "codigo_registro": "  "}, format="json"
        )
        self.assertEqual(resp.status_code, 201, resp.content)
        self.assertEqual(Medicamento.objects.filter(codigo_registro__isnull=True).count(), 2)

    def test_busca_por_principio_ativo(self):
        self.client.post(URL_LISTA, PAYLOAD, format="json")
        resp = self.client.get(URL_LISTA, {"busca": "sódica"})
        self.assertEqual(resp.status_code, 200)
        self.assertIn("Dipirona", resp.content.decode())
