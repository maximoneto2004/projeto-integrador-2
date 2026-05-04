import { useState } from "react";

import { cidadaoService } from "@/services/sistema/cidadaoService";
import type { Cidadao, CidadaoAgendamentoResumo, CidadaoPayload, Origem } from "@/types/api";

type Sexo = "MASCULINO" | "FEMININO" | "OUTRO" | "" | null | undefined;

export type CidadaoInput = {
  nome: string;
  cpf: string;
  telefone: string;
  email?: string | null;
  dataNascimento?: string | null;
  sexo?: Sexo;
  logradouro?: string;
  numero?: string;
  cep?: string;
  complemento?: string | null;
  bairro?: string | null;
  unidade_origem?: string | null;
  origem?: Origem | "" | null;
  apelido?: string | null;
  nis?: string | null;
  nome_mae?: string | null;
  rg?: string | null;
  orgao_emissor?: string | null;
  rg_uf?: string | null;
  data_emissao_rg?: string | null;
};

type CidadaoApi = CidadaoPayload & {
  id: string;
  data_nascimento?: string | null;
  agendamentos?: CidadaoAgendamentoResumo[];
  unidade?: { id?: string; nome?: string } | string | null;
  unidade_origem?: { id?: string; nome?: string } | string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
};

function normalizeCpf(value: string) {
  return value.replace(/\D/g, "");
}

function mapCidadao(api: CidadaoApi): Cidadao {
  const bairro = api.bairro && typeof api.bairro === "object" ? ((api.bairro as { id?: string }).id ?? null) : (api.bairro ?? null);
  const agendamentos = Array.isArray(api.agendamentos) ? api.agendamentos : [];

  return {
    id: String(api.id),
    nome: api.nome ?? "",
    cpf: api.cpf ?? "",
    telefone: api.telefone ?? "",
    email: api.email ?? null,
    dataNascimento: api.data_nascimento ?? null,
    sexo: api.sexo ?? null,
    logradouro: api.logradouro ?? "",
    numero: api.numero ?? "",
    cep: api.cep ?? "",
    complemento: api.complemento ?? null,
    bairro,
    unidade: api.unidade ?? api.unidade_origem ?? null,
    unidade_origem: api.unidade_origem ?? null,
    agendamentos,
    origem: api.origem ?? null,
    apelido: api.apelido ?? null,
    nis: api.nis ?? null,
    nome_mae: api.mae ?? null,
    rg: api.rg ?? null,
    orgao_emissor: api.orgao_emissor ?? null,
    rg_uf: api.rg_uf ?? null,
    data_emissao_rg: api.data_emissao_rg ?? null,
  };
}

function toPayload(input: Partial<CidadaoInput>): Partial<CidadaoPayload> {
  const sexo = input.sexo ? input.sexo.toString().toUpperCase() : undefined;

  return {
    nome: input.nome ?? "",
    cpf: input.cpf ? normalizeCpf(input.cpf) : "",
    telefone: input.telefone ?? "",
    email: input.email,
    data_nascimento: input.dataNascimento ?? undefined,
    sexo: (sexo as Sexo) ?? undefined,
    logradouro: input.logradouro ?? undefined,
    numero: input.numero ?? undefined,
    cep: input.cep ?? undefined,
    complemento: input.complemento === undefined ? undefined : input.complemento,
    bairro: input.bairro ?? undefined,
    unidade_origem: input.unidade_origem ?? undefined,
    origem: input.origem ?? undefined,
    apelido: input.apelido === undefined ? undefined : input.apelido,
    nis: input.nis ?? undefined,
    mae: input.nome_mae ?? undefined,
    rg: input.rg ?? undefined,
    orgao_emissor: input.orgao_emissor ?? undefined,
    rg_uf: input.rg_uf ?? undefined,
    data_emissao_rg: input.data_emissao_rg ?? undefined,
  };
}

export function useCidadaos() {
  const [cidadaos, setCidadaos] = useState<Cidadao[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function fetchCidadaos(params?: { cpf?: string; search?: string; limit?: number; offset?: number } | string) {
    setLoading(true);
    setError(null);
    try {
      const queryParams = (() => {
        if (typeof params === "string") {
          const cpf = normalizeCpf(params);
          return cpf ? { cpf } : undefined;
        }

        if (!params) return undefined;

        const cpf = params.cpf ? normalizeCpf(params.cpf) : undefined;
        return { ...params, ...(cpf ? { cpf } : {}) };
      })();

      const { data } = await cidadaoService.listar(queryParams);
      const lista = Array.isArray(data) ? data : (data.results ?? []);
      const count = Array.isArray(data) ? lista.length : (typeof data.count === "number" ? data.count : lista.length);
      setTotal(count);
      setCidadaos(lista.map(mapCidadao));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }

  async function createCidadao(input: CidadaoInput) {
    const payload = toPayload(input) as CidadaoPayload;
    const { data } = await cidadaoService.criar(payload);
    const cidadao = mapCidadao(data);
    setCidadaos((prev) => [cidadao, ...prev]);
    return cidadao;
  }

  async function updateCidadao(id: string, input: Partial<CidadaoInput>) {
    const payload = toPayload(input);
    const { data } = await cidadaoService.atualizar(id, payload);
    const cidadao = mapCidadao(data);
    setCidadaos((prev) => prev.map((c) => (c.id === id ? cidadao : c)));
    return cidadao;
  }

  async function removeCidadao(id: string) {
    await cidadaoService.deletar(id);
    setCidadaos((prev) => prev.filter((c) => c.id !== id));
  }

  return {
    cidadaos,
    total,
    loading,
    error,
    fetchCidadaos,
    createCidadao,
    updateCidadao,
    removeCidadao,
  };
}
