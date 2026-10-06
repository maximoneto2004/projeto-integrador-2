#!/usr/bin/env python3
"""Simula via HTTP o futuro orquestrador dos agentes, sem IA ou n8n."""

import argparse
import json
import os
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


LOCAL_HOSTS = {"localhost", "127.0.0.1", "::1"}


class SimulationError(RuntimeError):
    pass


@dataclass
class ApiResponse:
    status: int
    data: Any


class IntegrationApi:
    def __init__(self, base_url: str, integration_key: str, session_token: str | None = None):
        self.base_url = base_url.rstrip("/")
        self.integration_key = integration_key
        self.session_token = session_token

    def request(self, method: str, path: str, *, params=None, payload=None, login=False) -> ApiResponse:
        url = f"{self.base_url}{path}"
        if params:
            url += "?" + urlencode(params)
        headers = {"Accept": "application/json", "User-Agent": "simulador-integracao-ia/1.0"}
        if login:
            headers["X-Integration-Key"] = self.integration_key
        else:
            if not self.session_token:
                raise SimulationError("A operação de serviços exige um token de sessão em memória.")
            headers["X-Citizen-Session"] = self.session_token
        body = None
        if payload is not None:
            body = json.dumps(payload).encode("utf-8")
            headers["Content-Type"] = "application/json"
        request = Request(url, data=body, headers=headers, method=method)
        try:
            with urlopen(request, timeout=20) as response:
                raw = response.read()
                data = json.loads(raw.decode("utf-8")) if raw else None
                return ApiResponse(response.status, data)
        except HTTPError as exc:
            raw = exc.read()
            try:
                detail = json.loads(raw.decode("utf-8")) if raw else {}
            except (UnicodeDecodeError, json.JSONDecodeError):
                detail = {"detail": "Resposta não JSON omitida."}
            raise SimulationError(f"HTTP {exc.code} em {method} {path}: {detail}") from None
        except URLError as exc:
            raise SimulationError(f"Falha ao conectar em {self.base_url}: {exc.reason}") from None

    def get(self, path: str, *, params=None, login=False):
        return self.request("GET", path, params=params, login=login).data

    def post(self, path: str, *, payload=None, login=False):
        return self.request("POST", path, payload=payload or {}, login=login).data


def env(name: str, default=None):
    return os.getenv(name, default)


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--modo", choices=("leitura", "completo"), required=True)
    parser.add_argument("--base-url", default=env("IA_BASE_URL", "http://127.0.0.1:8000"))
    parser.add_argument("--integration-key", default=env("IA_INTEGRATION_KEY"))
    parser.add_argument("--telefone", default=env("IA_TELEFONE"))
    parser.add_argument("--cpf", default=env("IA_CPF"))
    parser.add_argument("--codigo-mock", default=env("IA_MOCK_CODE"))
    parser.add_argument("--session-token", default=env("IA_CITIZEN_SESSION"))
    parser.add_argument("--nome", default=env("IA_NOME"))
    parser.add_argument("--criar-cidadao", action="store_true")
    parser.add_argument("--confirmar-escrita", action="store_true", help="Autoriza criar e cancelar um agendamento de teste.")
    parser.add_argument("--manter-agendamento", action="store_true", help="Não cancela o agendamento criado pelo simulador.")
    parser.add_argument("--allow-remote", action="store_true")
    parser.add_argument("--confirmar-host", help="Para host remoto em modo completo, deve ser exatamente o hostname de destino.")
    return parser.parse_args(argv)


def validar_destino(args):
    parsed = urlparse(args.base_url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise SimulationError("Base URL inválida; informe http:// ou https:// com hostname.")
    remoto = parsed.hostname.lower() not in LOCAL_HOSTS
    if remoto and not args.allow_remote:
        raise SimulationError("Host externo bloqueado. Use --allow-remote após revisar o destino.")
    if remoto and args.modo == "completo" and args.confirmar_host != parsed.hostname:
        raise SimulationError("Modo completo remoto exige --confirmar-host igual ao hostname de destino.")
    if args.modo == "completo" and args.confirmar_escrita and remoto and args.confirmar_host != parsed.hostname:
        raise SimulationError("Escrita remota não foi confirmada para o hostname exato.")
    return parsed.hostname, remoto


def exigir(valor, mensagem):
    if not valor:
        raise SimulationError(mensagem)
    return valor


def autenticar(api: IntegrationApi, args):
    exigir(args.cpf, "Informe --cpf ou IA_CPF para autenticar.")
    busca = api.get("/api/v1/integracao/cidadao/buscar/", params={"cpf": args.cpf}, login=True)
    print(f"2. Cidadão localizado: {'sim' if busca.get('exists') else 'não'}")
    if not busca.get("exists"):
        if not args.criar_cidadao:
            raise SimulationError("Cidadão inexistente. Use --criar-cidadao e --nome somente se o fluxo permitir.")
        exigir(args.nome, "--nome ou IA_NOME é obrigatório para criar cidadão.")
        criado = api.post(
            "/api/v1/integracao/cidadao/criar/",
            payload={"nome": args.nome, "cpf": args.cpf, "telefone": args.telefone},
            login=True,
        )
        print(f"   Cadastro mock criado para: {criado.get('nome')}")
    desafio = api.post(
        "/api/v1/integracao/cidadao/auth/iniciar/",
        payload={"cpf": args.cpf, "telefone": args.telefone},
        login=True,
    )
    print(f"3. Challenge criado; entrega={desafio.get('delivery')}, expira={desafio.get('expires_at')}")
    exigir(args.codigo_mock, "Informe --codigo-mock ou IA_MOCK_CODE para concluir o fluxo local.")
    sessao = api.post(
        "/api/v1/integracao/cidadao/auth/verificar/",
        payload={"challenge_id": desafio["challenge_id"], "code": args.codigo_mock},
        login=True,
    )
    api.session_token = sessao["session_token"]
    print(f"4. Sessão criada em memória; duração restante={sessao.get('remaining_seconds')}s")


def escolher_opcao_agendamento(api: IntegrationApi, unidades, tipos):
    for unidade in unidades:
        for tipo in tipos:
            servicos = api.get(
                f"/api/v1/integracao/unidades/{unidade['id']}/servicos/",
                params={"tipo_id": tipo["id"]},
            ).get("results", [])
            if not servicos:
                continue
            vagas = api.get(
                "/api/v1/integracao/vagas/",
                params={"unidade_id": unidade["id"], "tipo_id": tipo["id"]},
            ).get("results", [])
            if vagas:
                return unidade, tipo, servicos[0], vagas[0]
    return None


def executar(args):
    host, remoto = validar_destino(args)
    exigir(args.integration_key, "Informe --integration-key ou IA_INTEGRATION_KEY.")
    exigir(args.telefone, "Informe --telefone ou IA_TELEFONE.")
    print(f"Destino: {args.base_url.rstrip('/')} ({'remoto autorizado' if remoto else 'local'})")
    print(f"Modo: {args.modo}")
    api = IntegrationApi(args.base_url, args.integration_key, args.session_token)

    status = api.get(
        "/api/v1/integracao/cidadao/sessao/",
        params={"telefone": args.telefone},
        login=True,
    )
    print(f"1. Sessão válida informada pelo backend: {'sim' if status.get('authenticated') else 'não'}")

    if args.modo == "leitura":
        exigir(api.session_token, "Modo leitura executa somente GET e exige --session-token ou IA_CITIZEN_SESSION.")
    elif not api.session_token:
        autenticar(api, args)

    bairros = api.get("/api/v1/integracao/bairros/").get("results", [])
    unidades = api.get("/api/v1/integracao/unidades/").get("results", [])
    tipos = api.get("/api/v1/integracao/tipos-servico/").get("results", [])
    print(f"5. Catálogos: {len(bairros)} bairros, {len(unidades)} unidades, {len(tipos)} tipos")

    opcao = escolher_opcao_agendamento(api, unidades, tipos)
    criado = None
    if opcao:
        unidade, tipo, servico, vaga = opcao
        print(
            "6. Opção disponível: "
            f"{servico['nome']} / {unidade['nome']} / {vaga['data']} {vaga['horario']} "
            f"({vaga['vagas_disponiveis']} vaga(s))"
        )
        if args.modo == "completo" and args.confirmar_escrita:
            criado = api.post(
                "/api/v1/integracao/agendamentos/",
                payload={"vaga_id": vaga["id"], "servico_id": servico["id"]},
            )
            print(f"7. Agendamento de teste criado: situação={criado.get('situacao')}")
        else:
            print("7. Escrita não autorizada; criação ignorada.")
    else:
        print("6. Nenhuma combinação serviço/vaga disponível.")

    agendamentos = api.get("/api/v1/integracao/agendamentos/").get("results", [])
    print(f"8. Agendamentos próprios listados: {len(agendamentos)}")
    if criado and not args.manter_agendamento:
        api.post(f"/api/v1/integracao/agendamentos/{criado['id']}/cancelar/")
        print("9. Agendamento criado pelo simulador cancelado.")
    elif criado:
        print("9. Agendamento mantido por solicitação explícita.")
    else:
        print("9. Nenhum cancelamento necessário.")

    receitas = api.get("/api/v1/integracao/receitas/").get("receitas", [])
    print(f"10. Receitas próprias listadas: {len(receitas)}")
    if receitas:
        receita_id = receitas[0]["id"]
        detalhe = api.get(f"/api/v1/integracao/receitas/{receita_id}/")
        disponibilidade = api.get(f"/api/v1/integracao/receitas/{receita_id}/disponibilidade/")
        print(
            f"11. Receita detalhada: {len(detalhe.get('medicamentos', []))} medicamento(s); "
            f"disponibilidade consultada para {len(disponibilidade.get('medicamentos', []))} item(ns)."
        )
    else:
        print("11. Sem receita para detalhar.")
    print("Simulação concluída sem persistir credenciais em arquivo.")


def main(argv=None):
    try:
        executar(parse_args(argv))
    except SimulationError as exc:
        print(f"ERRO: {exc}", file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
