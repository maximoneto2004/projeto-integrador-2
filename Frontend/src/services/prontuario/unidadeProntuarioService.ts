import { api } from "@/services/api";

export type UnidadeProntuario = {
  id?: string;
  orgao?: string;
  unidade?: string;
  nome?: string;
  contato?: string;
  telefone?: string;
  email?: string;
  is_active?: boolean;
};

export type UnidadeProntuarioPayload = {
  orgao?: string;
  unidade?: string;
  nome?: string;
  contato?: string;
  telefone?: string;
  email?: string;
  is_active?: boolean;
};

const PRONTUARIO_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

type ApiEnvelope<T> = {
  success?: boolean;
  count?: number;
  next?: string | null;
  previous?: string | null;
  result?: T;
  results?: T;
  data?: T;
  mensagem?: string;
  detail?: string;
};

export type UnidadeProntuarioListParams = {
  search?: string;
  limit?: number;
  offset?: number;
};

export const unidadeProntuarioService = {
  listar(params?: UnidadeProntuarioListParams) {
    const url = PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}/api/prontuario/unidade/` : "/api/prontuario/unidade/";
    return api.get<ApiEnvelope<UnidadeProntuario[] | string[]> | UnidadeProntuario[] | string[]>(url, { params });
  },
  criar(payload: UnidadeProntuarioPayload) {
    const url = PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}/api/prontuario/unidade/` : "/api/prontuario/unidade/";
    return api.post<ApiEnvelope<UnidadeProntuario> | UnidadeProntuario | unknown>(url, payload);
  },
  atualizar(id: string, payload: Partial<UnidadeProntuarioPayload>) {
    const url = PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}/api/prontuario/unidade/${id}/` : `/api/prontuario/unidade/${id}/`;
    return api.patch<ApiEnvelope<UnidadeProntuario> | UnidadeProntuario | unknown>(url, payload);
  },
  ativar(id: string) {
    const url = PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}/api/prontuario/unidade/${id}/` : `/api/prontuario/unidade/${id}/`;
    return api.patch<ApiEnvelope<unknown> | unknown>(url, { is_active: true });
  },
  desativar(id: string) {
    const url = PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}/api/prontuario/unidade/${id}/` : `/api/prontuario/unidade/${id}/`;
    return api.patch<ApiEnvelope<unknown> | unknown>(url, { is_active: false });
  },
};
