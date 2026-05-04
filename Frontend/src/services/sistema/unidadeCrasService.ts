import { api } from "@/services/api";
import type { UnidadeCras } from "@/types/api";

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

export type UnidadeCrasListParams = {
  nome?: string;
  limit?: number;
  offset?: number;
};

export type UnidadeCrasPayload = {
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

const BASE_PATH = "/unidade_cras_list/";

export const unidadeCrasService = {
  async listar(nome?: string): Promise<UnidadeCras[]> {
    const { data } = await api.get<UnidadeCras[] | ApiEnvelope<UnidadeCras[]>>(BASE_PATH, { params: { nome } });
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
          ? ((nested as { result: UnidadeCras[] }).result ?? [])
          : [];
  },

  async listarPaginado(params?: UnidadeCrasListParams): Promise<{ items: UnidadeCras[]; count: number }> {
    const { data } = await api.get<UnidadeCras[] | ApiEnvelope<UnidadeCras[]>>(BASE_PATH, { params });

    if (Array.isArray(data)) {
      return { items: data, count: data.length };
    }

    const nested = data?.results && typeof data.results === "object" && !Array.isArray(data.results) ? data.results : undefined;
    const items = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.result)
        ? data.result
        : Array.isArray((nested as { result?: unknown })?.result)
          ? ((nested as { result: UnidadeCras[] }).result ?? [])
          : [];

    const count = typeof data?.count === "number" ? data.count : items.length;
    return { items, count };
  },

  criar(payload: UnidadeCrasPayload) {
    return api.post<UnidadeCras | ApiEnvelope<UnidadeCras>>(BASE_PATH, payload);
  },

  atualizar(id: string, payload: Partial<UnidadeCrasPayload>) {
    return api.patch<UnidadeCras | ApiEnvelope<UnidadeCras>>(`${BASE_PATH}${id}/`, payload);
  },
};
