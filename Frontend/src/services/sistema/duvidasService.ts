import type { AxiosResponse } from "axios";
import { api } from "../api";
import type { DuvidaListResponse, DuvidaPayload, DuvidaResponse, DuvidaParams } from "@/types/duvidaFrequentes";

export const duvidaService = {
  listar(params?: DuvidaParams): Promise<AxiosResponse<DuvidaListResponse>> {
    return api.get<DuvidaListResponse>("/duvida/", { params });
  },

  criar(payload: DuvidaPayload): Promise<AxiosResponse<DuvidaResponse>> {
    return api.post<DuvidaResponse>("/duvida/", payload);
  },

  atualizar(id: string, payload: DuvidaPayload): Promise<AxiosResponse<DuvidaResponse>> {
    return api.patch<DuvidaResponse>(`/duvida/${id}/`, payload);
  },
  remover(id: string) {
    return api.delete(`/duvida/${id}/`);
  },
};
