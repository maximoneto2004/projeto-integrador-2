import { api } from "@/services/api";
import type { ServicoDetalhado, ServicoUnidadePosto } from "@/types/api";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  result?: T;
  mensagem?: string;
};

type ApiPaginatedEnvelope<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T;
};

const API_URL = import.meta.env.VITE_API_URL;

type ServicoUnidadePostoPayload = {
  unidade: string;
  servico: string;
  dias_semana: string[];
  mesmo_expediente: boolean;
  hora_manha_inicio?: string | null;
  hora_manha_fim?: string | null;
  hora_tarde_inicio?: string | null;
  hora_tarde_fim?: string | null;
  is_active?: boolean;
};

export type ServicosUnidadePaginados = {
  items: ServicoUnidadePosto[];
  count: number;
  next: string | null;
  previous: string | null;
};

export const servicosConfigService = {
  async listarServicos(): Promise<ServicoDetalhado[]> {
    const { data } = await api.get<ApiEnvelope<ServicoDetalhado[]>>(`${API_URL}/servico/`);
    if (data?.success === false) {
      return [];
    }
    return Array.isArray(data?.result) ? data.result : [];
  },

  async listarServicosUnidade(params?: { unidade?: string }): Promise<ServicoUnidadePosto[]> {
    const { data } = await api.get<ApiEnvelope<ServicoUnidadePosto[]>>(
      `${API_URL}/servico_unidade_posto/`,
      { params },
    );
    if (data?.success === false) {
      return [];
    }
    return Array.isArray(data?.data) ? data.data : [];
  },

  async listarServicosUnidadePaginado(params?: {
    unidade?: string;
    nome?: string;
    limit?: string;
    offset?: string;
  }): Promise<ServicosUnidadePaginados> {
    const { data } = await api.get<
      ApiEnvelope<ServicoUnidadePosto[]>
      | ApiPaginatedEnvelope<ApiEnvelope<ServicoUnidadePosto[]>>
      | ApiPaginatedEnvelope<ApiEnvelope<ServicoUnidadePosto[]> | ServicoUnidadePosto[]>
    >(`${API_URL}/servico_unidade_posto/`, { params });

    const body = (data && typeof data === "object" ? (data as Record<string, unknown>) : {}) as Record<string, unknown>;
    const isPaginated = "count" in body && "results" in body;

    if (!isPaginated) {
      const listaDireta = Array.isArray((data as ApiEnvelope<ServicoUnidadePosto[]>)?.data)
        ? ((data as ApiEnvelope<ServicoUnidadePosto[]>).data as ServicoUnidadePosto[])
        : [];
      return {
        items: listaDireta,
        count: listaDireta.length,
        next: null,
        previous: null,
      };
    }

    const payload = body.results as ApiEnvelope<ServicoUnidadePosto[]> | ServicoUnidadePosto[] | undefined;
    let items: ServicoUnidadePosto[] = [];
    if (Array.isArray(payload)) {
      items = payload;
    } else if (payload && typeof payload === "object" && Array.isArray((payload as ApiEnvelope<ServicoUnidadePosto[]>).data)) {
      items = ((payload as ApiEnvelope<ServicoUnidadePosto[]>).data as ServicoUnidadePosto[]) ?? [];
    }

    return {
      items,
      count: typeof body.count === "number" ? body.count : items.length,
      next: typeof body.next === "string" ? body.next : null,
      previous: typeof body.previous === "string" ? body.previous : null,
    };
  },

  criarServicoUnidade(payload: ServicoUnidadePostoPayload) {
    return api.post<ApiEnvelope<ServicoUnidadePosto>>(`${API_URL}/servico_unidade_posto/`, payload);
  },

  atualizarServicoUnidade(id: string, payload: Partial<ServicoUnidadePostoPayload>) {
    return api.patch<ApiEnvelope<ServicoUnidadePosto>>(`${API_URL}/servico_unidade_posto/${id}/`, payload);
  },

  removerServicoUnidade(id: string) {
    return api.delete<ApiEnvelope<ServicoUnidadePosto>>(`${API_URL}/servico_unidade_posto/${id}/`);
  },
};
