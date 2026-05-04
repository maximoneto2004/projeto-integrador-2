import type { AxiosResponse } from "axios";

import { api } from "../api";
import type { Bairro } from "@/types/api";

type BairroListResponse = { success?: boolean; result?: Bairro[]; mensagem?: string };
type BairroResponse = { success?: boolean; result?: Bairro; mensagem?: string };
type BairroPayload = { nome: string; is_active?: boolean };
type BairroParams = { nome?: string; limit?: number; offset?: number };

export const bairroService = {
  listar(params?: BairroParams): Promise<AxiosResponse<BairroListResponse>> {
    return api.get<BairroListResponse>("/bairro/", { params });
  },
  criar(payload: BairroPayload): Promise<AxiosResponse<BairroResponse>> {
    return api.post<BairroResponse>("/bairro/", payload);
  },
  atualizar(id: string, payload: BairroPayload): Promise<AxiosResponse<BairroResponse>> {
    return api.patch<BairroResponse>(`/bairro/${id}`, payload);
  },
  remover(id: string): Promise<AxiosResponse<BairroResponse>> {
    return api.delete<BairroResponse>(`/bairro/${id}`);
  },
};
