import { api } from "@/services/api";

export type MembroComposicaoPayload = {
  prontuario: string;
  cidadao: string;
  parentesco?: string;
  data_entrada?: string | null;
  data_saida?: string | null;
  responsavel?: boolean;
  ativo?: boolean;
};

export type MembroComposicaoResponse = {
  id: string;
  prontuario: string;
  cidadao: { id?: string; nome_completo?: string } | string;
  parentesco?: string;
  data_entrada?: string | null;
  data_saida?: string | null;
  responsavel?: boolean;
  ativo?: boolean;
};

export type ParentescoOption = {
  value: string;
  label: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  mensagem?: string;
  detail?: string;
};

const PRONTUARIO_BASE_URL = (import.meta.env.VITE_API_URL || "")
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/$/, "");

export const membroComposicaoService = {
  listar(params?: { prontuario?: string }) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/membro/`
      : "/api/prontuario/membro/";
    return api.get<ApiEnvelope<MembroComposicaoResponse[] | string[]> | MembroComposicaoResponse[] | string[]>(url, { params });
  },
  criar(payload: MembroComposicaoPayload) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/membro/`
      : "/api/prontuario/membro/";
    return api.post<ApiEnvelope<MembroComposicaoResponse> | MembroComposicaoResponse>(url, payload);
  },
  atualizar(id: string, payload: Partial<MembroComposicaoPayload>) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/membro/${id}`
      : `/api/prontuario/membro/${id}/`;
    return api.patch<ApiEnvelope<MembroComposicaoResponse> | MembroComposicaoResponse>(url, payload);
  },
  listarParentescos() {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/membro/parentesco-opcoes/`
      : "/api/prontuario/membro/parentesco-opcoes/";
    return api.get<ApiEnvelope<ParentescoOption[] | string[]> | ParentescoOption[] | string[]>(url);
  },
};
