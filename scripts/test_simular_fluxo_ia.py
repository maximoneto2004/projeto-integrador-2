from types import SimpleNamespace
from unittest import TestCase

from scripts.simular_fluxo_ia import SimulationError, parse_args, validar_destino


class SimuladorSegurancaTests(TestCase):
    def test_default_aponta_para_loopback(self):
        args = parse_args(["--modo", "leitura"])
        self.assertEqual(args.base_url, "http://127.0.0.1:8000")

    def test_host_remoto_e_bloqueado_por_padrao(self):
        args = SimpleNamespace(
            base_url="https://producao.example",
            allow_remote=False,
            modo="leitura",
            confirmar_host=None,
            confirmar_escrita=False,
        )
        with self.assertRaises(SimulationError):
            validar_destino(args)

    def test_modo_completo_remoto_exige_hostname_exato(self):
        args = SimpleNamespace(
            base_url="https://homologacao.example",
            allow_remote=True,
            modo="completo",
            confirmar_host="outro.example",
            confirmar_escrita=True,
        )
        with self.assertRaises(SimulationError):
            validar_destino(args)

    def test_modo_completo_remoto_com_confirmacao_exata(self):
        args = SimpleNamespace(
            base_url="https://homologacao.example",
            allow_remote=True,
            modo="completo",
            confirmar_host="homologacao.example",
            confirmar_escrita=True,
        )
        host, remoto = validar_destino(args)
        self.assertEqual(host, "homologacao.example")
        self.assertTrue(remoto)
