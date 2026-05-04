import { api } from "@/services/api";
import type { Servico, ServicoDetalhado, TipoMarcacao } from "@/types/api";
import { ClasseServicoListParams } from "@/types/servicos";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  result?: T;
  results?: T;
  mensagem?: string;
};

const API_URL = import.meta.env.VITE_API_URL;

export type ServicoPayload = {
  nome: string;
  descricao?: string | null;
  classe: string;
  tipo_servico: string;
  tipo_marcacao?: TipoMarcacao;
  is_active?: boolean;
};

export const servicoAdminService = {
  async listar(params?: ClasseServicoListParams): Promise<ServicoDetalhado[]> {
    const { data } = await api.get<ApiEnvelope<ServicoDetalhado[]> | ServicoDetalhado[]>(`${API_URL}/servico/`, { params });

    if (Array.isArray(data)) {
      return data;
    }

    if (data?.success === false) {
      return [];
    }

    const payload = data?.data ?? data?.result ?? data?.results;
    return Array.isArray(payload) ? payload : [];
  },
  criar(payload: ServicoPayload) {
    return api.post<ApiEnvelope<Servico>>(`${API_URL}/servico/`, payload);
  },
  atualizar(id: string, payload: Partial<ServicoPayload>) {
    return api.patch<ApiEnvelope<Servico>>(`${API_URL}/servico/${id}`, payload);
  },
  remover(id: string) {
    return api.delete<ApiEnvelope<unknown>>(`${API_URL}/servico/${id}`);
  },
};
