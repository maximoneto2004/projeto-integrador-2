import { api } from "@/services/api";

type ApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  mensagem?: string;
  detail?: string;
};

export type ExclusaoMembroComposicaoPayload = {
  membro_id: string;
  motivo: string;
};

export type ExclusaoMembroComposicaoResponse = {
  id: string;
  membro_id: string;
  motivo: string;
  data_exclusao?: string;
};

const PRONTUARIO_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

export const exclusaoMembroComposicaoService = {
  listar(params?: { membro?: string }) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/exclusao-membro-composicao/`
      : "/api/prontuario/exclusao-membro-composicao/";
    return api.get<ApiEnvelope<ExclusaoMembroComposicaoResponse[]> | ExclusaoMembroComposicaoResponse[]>(url, { params });
  },
  criar(payload: ExclusaoMembroComposicaoPayload) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/exclusao-membro-composicao/`
      : "/api/prontuario/exclusao-membro-composicao/";
    return api.post<ApiEnvelope<ExclusaoMembroComposicaoResponse> | ExclusaoMembroComposicaoResponse>(url, payload);
  },
};
