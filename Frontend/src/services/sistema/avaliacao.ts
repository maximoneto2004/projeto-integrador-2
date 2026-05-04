import type { AxiosResponse } from "axios";

import { api } from "../api";
import type { Avaliacao } from "@/types/avaliacao";

type AvaliacaoListResponse = {
  success?: boolean;
  result?: Avaliacao[];
  mensagem?: string;
};

type AvaliacaoResponse = {
  success?: boolean;
  result?: Avaliacao;
  mensagem?: string;
};

type AvaliacaoPayload = {
  agendamento: string;
  nota: number;
  comentario?: string;
  is_active?: boolean;
};

type AvaliacaoParams = {
  agendamento?: string;
};

export const avaliacaoService = {
  listar(params?: AvaliacaoParams): Promise<AxiosResponse<AvaliacaoListResponse>> {
    return api.get<AvaliacaoListResponse>("/avaliacao/", { params });
  },

  criar(payload: AvaliacaoPayload): Promise<AxiosResponse<AvaliacaoResponse>> {
    return api.post<AvaliacaoResponse>("/avaliacao/", payload);
  },

  atualizar(id: string, payload: AvaliacaoPayload): Promise<AxiosResponse<AvaliacaoResponse>> {
    return api.patch<AvaliacaoResponse>(`/avaliacao/${id}`, payload);
  },

  remover(id: string): Promise<AxiosResponse<AvaliacaoResponse>> {
    return api.delete<AvaliacaoResponse>(`/avaliacao/${id}`);
  },
};
