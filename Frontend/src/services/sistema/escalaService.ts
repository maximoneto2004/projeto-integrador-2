import { api } from "@/services/api";
import type { ApiResponse, CriarEscalaPayload, EscalaApi } from "@/types/escalas";

export const escalaService = {
  async listar(params?: Record<string, string | undefined>): Promise<EscalaApi[]> {
    const res = await api.get<ApiResponse<EscalaApi[]>>("/usuarios/escalas/", { params });
    const data = (res.data as ApiResponse<EscalaApi[]> & { result?: EscalaApi[] }).data ?? (res.data as { result?: EscalaApi[] }).result;
    return Array.isArray(data) ? data : [];
  },

  async criar(payload: CriarEscalaPayload): Promise<EscalaApi> {
    const res = await api.post<ApiResponse<EscalaApi>>("/usuarios/escalas/", payload);
    return res.data.data;
  },

  async atualizar(id: string, payload: Partial<CriarEscalaPayload>): Promise<EscalaApi> {
    const res = await api.patch<ApiResponse<EscalaApi>>(`/usuarios/escalas/${id}/`, payload);
    return res.data.data;
  },

  async remover(id: string): Promise<void> {
    await api.delete(`/usuarios/escalas/${id}/`);
  },
};
