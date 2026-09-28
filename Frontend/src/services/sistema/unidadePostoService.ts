import { api } from "@/services/api";
import type { UnidadePosto } from "@/types/api";

type ApiEnvelope<T> = {
  success?: boolean;
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T | { success?: boolean; result?: T; mensagem?: string };
  data?: T;
  result?: T;
  mensagem?: string;
};

export type UnidadePostoListParams = {
  nome?: string;
  limit?: number;
  offset?: number;
};

export type UnidadePostoPayload = {
  nome: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  cep: string;
  bairro: string;
  bairros_abrangencia?: string[];
  telefone: string;
  email: string;
  hora_manha_inicio?: string | null;
  hora_manha_fim?: string | null;
  hora_tarde_inicio?: string | null;
  hora_tarde_fim?: string | null;
  is_active?: boolean;
};

const BASE_PATH = "/unidade_posto_list/";

export const unidadePostoService = {
  async listar(nome?: string): Promise<UnidadePosto[]> {
    const { data } = await api.get<UnidadePosto[] | ApiEnvelope<UnidadePosto[]>>(BASE_PATH, { params: { nome } });
    if (Array.isArray(data)) {
      return data;
    }
    if (data?.success === false) {
      return [];
    }
    const nested = data?.results && typeof data.results === "object" && !Array.isArray(data.results) ? data.results : undefined;
    return Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.result)
        ? data.result
        : Array.isArray((nested as { result?: unknown })?.result)
          ? ((nested as { result: UnidadePosto[] }).result ?? [])
          : [];
  },

  async listarPaginado(params?: UnidadePostoListParams): Promise<{ items: UnidadePosto[]; count: number }> {
    const { data } = await api.get<UnidadePosto[] | ApiEnvelope<UnidadePosto[]>>(BASE_PATH, { params });

    if (Array.isArray(data)) {
      return { items: data, count: data.length };
    }

    const nested = data?.results && typeof data.results === "object" && !Array.isArray(data.results) ? data.results : undefined;
    const items = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.result)
        ? data.result
        : Array.isArray((nested as { result?: unknown })?.result)
          ? ((nested as { result: UnidadePosto[] }).result ?? [])
          : [];

    const count = typeof data?.count === "number" ? data.count : items.length;
    return { items, count };
  },

  criar(payload: UnidadePostoPayload) {
    return api.post<UnidadePosto | ApiEnvelope<UnidadePosto>>(BASE_PATH, payload);
  },

  atualizar(id: string, payload: Partial<UnidadePostoPayload>) {
    return api.patch<UnidadePosto | ApiEnvelope<UnidadePosto>>(`${BASE_PATH}${id}/`, payload);
  },
};
