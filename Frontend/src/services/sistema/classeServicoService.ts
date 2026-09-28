import { api } from "@/services/api";
import type { ClasseServicoResumo } from "@/types/api";
import { ClasseServicoListParams } from "@/types/servicos";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  result?: T;
  mensagem?: string;
};

export const classeServicoService = {
  async listar(params: ClasseServicoListParams): Promise<ClasseServicoResumo[]> {
    const { data } = await api.get<ApiEnvelope<ClasseServicoResumo[]> | ClasseServicoResumo[]>(`/classe-servico/`, { params });

    if (Array.isArray(data)) {
      return data;
    }

    if (data?.success === false) {
      return [];
    }

    const payload = data?.data ?? data?.result;
    return Array.isArray(payload) ? payload : [];
  },
  criar(payload: { nome: string; descricao?: string | null; is_active?: boolean }) {
    return api.post<ApiEnvelope<ClasseServicoResumo>>(`/classe-servico/`, payload);
  },
  atualizar(id: string, payload: { nome?: string; descricao?: string | null; is_active?: boolean }) {
    return api.patch<ApiEnvelope<ClasseServicoResumo>>(`/classe-servico/${id}`, payload);
  },
  remover(id: string) {
    return api.delete<ApiEnvelope<unknown>>(`/classe-servico/${id}`);
  },
};
