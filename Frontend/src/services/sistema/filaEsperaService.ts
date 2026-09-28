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

export const filaEsperaService = {
  listar(params?: FilaEsperaListParams) {
    return api.get<ApiEnvelope<FilaEsperaResponse[]> | PaginatedResponse<ApiEnvelope<FilaEsperaResponse[]>>>(
      `/fila-espera/`,
      { params },
    );
  },

  criar(payload: FilaEsperaPayload): Promise<AxiosResponse<ApiEnvelope<FilaEsperaResponse>>> {
    return api.post<ApiEnvelope<FilaEsperaResponse>>(`/fila-espera/`, payload);
  },

  atualizar(
    id: string,
    payload: Partial<FilaEsperaPayload>,
  ): Promise<AxiosResponse<ApiEnvelope<FilaEsperaResponse>>> {
    return api.patch<ApiEnvelope<FilaEsperaResponse>>(`/fila-espera/${id}/`, payload);
  },

  atualizarUrgencia(id: string, urgencia: UrgenciaAtendimento) {
    return this.atualizar(id, { urgencia });
  },

  deletar(id: string) {
    return api.delete<{ success?: boolean; mensagem?: string }>(`/fila-espera/${id}/`);
  },

  chamarProximo() {
    return api.post<ApiEnvelope<FilaEsperaChamadaResponse[]>>(`/fila-espera/chamar-proximo/`);
  },
};
