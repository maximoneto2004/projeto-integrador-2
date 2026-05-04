import type { AxiosResponse } from "axios";
import { api } from "@/services/api";
import type { PaginatedResponse } from "@/types/api";
import type { FilaEsperaPayload, FilaEsperaResponse, UrgenciaAtendimento } from "@/types/api";

type ApiEnvelope<T> = {
  success: boolean;
  result: T;
  mensagem?: string;
};

type FilaEsperaListParams = {
  cpf?: string;
  nome?: string;
  limit?: number;
  offset?: number;
};

type FilaEsperaChamadaResponse = {
  id: string;
  cidadao: string;
  unidade: string;
  guiche: string;
  guiche_id: string;
  local: string;
  horario_chamada: string;
};

const API_URL = import.meta.env.VITE_API_URL;

export const filaEsperaService = {
  listar(params?: FilaEsperaListParams) {
    return api.get<ApiEnvelope<FilaEsperaResponse[]> | PaginatedResponse<ApiEnvelope<FilaEsperaResponse[]>>>(
      `${API_URL}/fila-espera/`,
      { params },
    );
  },

  criar(payload: FilaEsperaPayload): Promise<AxiosResponse<ApiEnvelope<FilaEsperaResponse>>> {
    return api.post<ApiEnvelope<FilaEsperaResponse>>(`${API_URL}/fila-espera/`, payload);
  },

  atualizar(
    id: string,
    payload: Partial<FilaEsperaPayload>,
  ): Promise<AxiosResponse<ApiEnvelope<FilaEsperaResponse>>> {
    return api.patch<ApiEnvelope<FilaEsperaResponse>>(`${API_URL}/fila-espera/${id}/`, payload);
  },

  atualizarUrgencia(id: string, urgencia: UrgenciaAtendimento) {
    return this.atualizar(id, { urgencia });
  },

  deletar(id: string) {
    return api.delete<{ success?: boolean; mensagem?: string }>(`${API_URL}/fila-espera/${id}/`);
  },

  chamarProximo() {
    return api.post<ApiEnvelope<FilaEsperaChamadaResponse[]>>(`${API_URL}/fila-espera/chamar-proximo/`);
  },
};
