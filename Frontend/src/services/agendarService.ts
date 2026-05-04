
import { api } from "./api";

export type UnidadeOption = {
  id: string;
  nome: string;
};

export type TipoServicoOption = {
  id: string;
  nome: string;
};

export type ServicoOption = {
  id: string;
  nome: string;
};

export type VagaOption = {
  id: string;
  horario: string;
  vagas: number;
  vagas_ocupadas: number;
  vagas_disponiveis: number;
};

type UnidadeListEnvelope = {
  success?: boolean;
  result?: UnidadeOption[];
};

type UnidadeListPaginatedEnvelope = {
  results?: UnidadeListEnvelope | UnidadeOption[];
};

export const getUnidadesFromResponse = (data: unknown): UnidadeOption[] => {
  if (Array.isArray(data)) return data as UnidadeOption[];
  if (!data || typeof data !== "object") return [];

  const envelope = data as UnidadeListEnvelope;
  if (Array.isArray(envelope.result)) return envelope.result;

  const paginated = data as UnidadeListPaginatedEnvelope;
  if (Array.isArray(paginated.results)) return paginated.results as UnidadeOption[];
  if (paginated.results && typeof paginated.results === "object") {
    const nested = paginated.results as UnidadeListEnvelope;
    if (Array.isArray(nested.result)) return nested.result;
  }

  return [];
};

export const agendarService = {
  listarUnidades() {
    return api.get<{ success?: boolean; result?: UnidadeOption[] | string } | UnidadeOption[]>(
      "/unidade_cras_list/",
    );
  },

  listarTipos(unidadeId: string) {
    return api.get<{ tipos: TipoServicoOption[] }>(`/ajax/tipos/${unidadeId}/`);
  },

  listarServicos(unidadeId: string, tipoId: string) {
    return api.get<{ servicos: ServicoOption[] }>(`/ajax/servicos/${unidadeId}/${tipoId}/`);
  },

  listarVagas(unidadeId: string, tipoId: string, dataISO: string) {
    return api.get<{ success?: boolean; result?: VagaOption[] } | VagaOption[]>(
      "/vagas/",
      { params: { unidade: unidadeId} },
    );
  },

  criarAgendamento(payload: { vagaId: string; servicoId: string }) {
    const body = new URLSearchParams();
    body.append("vaga_id", payload.vagaId);
    body.append("servico_id", payload.servicoId);

    return api.post(
      "/ajax/agendar/",
      body.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
  },
};
