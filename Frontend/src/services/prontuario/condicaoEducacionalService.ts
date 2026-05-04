import { api } from "@/services/api";

type ApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  mensagem?: string;
  detail?: string;
};

const PRONTUARIO_BASE_URL = (import.meta.env.VITE_API_URL || "")
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/$/, "");

export type CondicaoEducacionalPayload = {
  prontuario: string;
  condicao_educacional_membro?: string[];
  observacao_geral?: string;
  descumprimento_educacional_membro?: string[];
};

export type CondicaoEducacionalResponse = CondicaoEducacionalPayload & {
  id: string;
};

export type CondicaoEducacionalMembroPayload = {
  prontuario: string;
  membro: string;
  escolaridade?: string;
  alfabetizado?: boolean;
  frequencia?: string;
  situacao?: string;
  observacao?: string;
};

export type CondicaoEducacionalMembroResponse = CondicaoEducacionalMembroPayload & {
  id: string;
};

export type DescumprimentoEducacionalPayload = {
  prontuario: string;
  membro: string;
  efeito_codigo: string;
  data_ocorrencia?: string;
};

export type DescumprimentoEducacionalResponse = DescumprimentoEducacionalPayload & {
  id: string;
};

export const condicaoEducacionalService = {
  listar(params?: { prontuario?: string }) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/condicao-educacional/`
      : "/api/prontuario/condicao-educacional/";
    return api.get<ApiEnvelope<CondicaoEducacionalResponse[] | string[]> | CondicaoEducacionalResponse[] | string[]>(
      url,
      { params }
    );
  },
  criar(payload: CondicaoEducacionalPayload) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/condicao-educacional/`
      : "/api/prontuario/condicao-educacional/";
    return api.post<ApiEnvelope<CondicaoEducacionalResponse> | CondicaoEducacionalResponse>(url, payload);
  },
  atualizar(id: string, payload: Partial<CondicaoEducacionalPayload>) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/condicao-educacional/${id}`
      : `/api/prontuario/condicao-educacional/${id}/`;
    return api.patch<ApiEnvelope<CondicaoEducacionalResponse> | CondicaoEducacionalResponse>(url, payload);
  },
  listarMembro(params?: { prontuario?: string }) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/condicao-educacional-membro/`
      : "/api/prontuario/condicao-educacional-membro/";
    return api.get<
      ApiEnvelope<CondicaoEducacionalMembroResponse[] | string[]> | CondicaoEducacionalMembroResponse[] | string[]
    >(url, { params });
  },
  criarMembro(payload: CondicaoEducacionalMembroPayload) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/condicao-educacional-membro/`
      : "/api/prontuario/condicao-educacional-membro/";
    return api.post<ApiEnvelope<CondicaoEducacionalMembroResponse> | CondicaoEducacionalMembroResponse>(url, payload);
  },
  atualizarMembro(id: string, payload: Partial<CondicaoEducacionalMembroPayload>) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/condicao-educacional-membro/${id}`
      : `/api/prontuario/condicao-educacional-membro/${id}/`;
    return api.patch<ApiEnvelope<CondicaoEducacionalMembroResponse> | CondicaoEducacionalMembroResponse>(url, payload);
  },
  listarDescumprimento(params?: { prontuario?: string }) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/descumprimento-educacional/`
      : "/api/prontuario/descumprimento-educacional/";
    return api.get<
      ApiEnvelope<DescumprimentoEducacionalResponse[] | string[]> | DescumprimentoEducacionalResponse[] | string[]
    >(url, { params });
  },
  criarDescumprimento(payload: DescumprimentoEducacionalPayload) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/descumprimento-educacional/`
      : "/api/prontuario/descumprimento-educacional/";
    return api.post<ApiEnvelope<DescumprimentoEducacionalResponse> | DescumprimentoEducacionalResponse>(url, payload);
  },
  atualizarDescumprimento(id: string, payload: Partial<DescumprimentoEducacionalPayload>) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/descumprimento-educacional/${id}`
      : `/api/prontuario/descumprimento-educacional/${id}/`;
    return api.patch<ApiEnvelope<DescumprimentoEducacionalResponse> | DescumprimentoEducacionalResponse>(url, payload);
  },
};
