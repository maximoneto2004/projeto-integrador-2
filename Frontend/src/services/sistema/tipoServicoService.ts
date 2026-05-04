import { api } from "@/services/api";
import type { TipoServicoResumo } from "@/types/api";
import { ClasseServicoListParams } from "@/types/servicos";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  result?: T;
  results?: T;
  mensagem?: string;
};

const API_URL = import.meta.env.VITE_API_URL;

export const tipoServicoService = {
  async listar(params?: ClasseServicoListParams): Promise<TipoServicoResumo[]> {
    const { data } = await api.get<ApiEnvelope<TipoServicoResumo[]> | TipoServicoResumo[]>(`${API_URL}/tipo-servico/`, { params });

    if (Array.isArray(data)) {
      return data;
    }

    if (data?.success === false) {
      return [];
    }

    const payload = data?.data ?? data?.result ?? data?.results;
    return Array.isArray(payload) ? payload : [];
  },
  criar(payload: { nome: string; descricao?: string | null; tempo_atendimento?: number; is_active?: boolean }) {
    return api.post<ApiEnvelope<TipoServicoResumo>>(`${API_URL}/tipo-servico/`, payload);
  },
  atualizar(
    id: string,
    payload: {
      nome?: string;
      descricao?: string | null;
      tempo_atendimento?: number;
      is_active?: boolean;
    }
  ) {
    return api.patch<ApiEnvelope<TipoServicoResumo>>(`${API_URL}/tipo-servico/${id}`, payload);
  },
  remover(id: string) {
    return api.delete<ApiEnvelope<unknown>>(`${API_URL}/tipo-servico/${id}`);
  },
};
