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

const buildUrl = (path: string) =>
  PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}${path}` : path;

export type AcolhimentoFamiliarPayload = {
  prontuario: string;
  membro: string;
  data_entrada: string;
  data_saida?: string;
  motivo: string;
  detalhe?: string;
};

export type AcolhimentoFamiliarResponse = AcolhimentoFamiliarPayload & {
  id: string;
};

export type AcolhimentoInstitucionalPayload = {
  prontuario: string;
  acolhimento_familiar?: string[];
  perda_domicilio?: string;
  guarda_terceiros?: string;
  adulto_prisional?: boolean;
  adolescente_internacao?: boolean;
  observacao?: string;
};

export type AcolhimentoInstitucionalResponse = AcolhimentoInstitucionalPayload & {
  id: string;
};

export const acolhimentoInstitucionalService = {
  listarAcolhimentoFamiliar(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<AcolhimentoFamiliarResponse[] | string[]>
      | AcolhimentoFamiliarResponse[]
      | string[]
    >(buildUrl("/api/prontuario/acolhimento-familiar/"), { params });
  },
  criarAcolhimentoFamiliar(payload: AcolhimentoFamiliarPayload) {
    return api.post<ApiEnvelope<AcolhimentoFamiliarResponse> | AcolhimentoFamiliarResponse>(
      buildUrl("/api/prontuario/acolhimento-familiar/"),
      payload
    );
  },
  atualizarAcolhimentoFamiliar(id: string, payload: Partial<AcolhimentoFamiliarPayload>) {
    return api.patch<ApiEnvelope<AcolhimentoFamiliarResponse> | AcolhimentoFamiliarResponse>(
      buildUrl(`/api/prontuario/acolhimento-familiar/${id}`),
      payload
    );
  },
  removerAcolhimentoFamiliar(id: string) {
    return api.delete<ApiEnvelope<string> | string>(buildUrl(`/api/prontuario/acolhimento-familiar/${id}`));
  },
  listarAcolhimentoInstitucional(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<AcolhimentoInstitucionalResponse[] | string[]>
      | AcolhimentoInstitucionalResponse[]
      | string[]
    >(buildUrl("/api/prontuario/acolhimento-institucional/"), { params });
  },
  criarAcolhimentoInstitucional(payload: AcolhimentoInstitucionalPayload) {
    return api.post<
      ApiEnvelope<AcolhimentoInstitucionalResponse> | AcolhimentoInstitucionalResponse
    >(buildUrl("/api/prontuario/acolhimento-institucional/"), payload);
  },
  atualizarAcolhimentoInstitucional(
    id: string,
    payload: Partial<AcolhimentoInstitucionalPayload>
  ) {
    return api.patch<
      ApiEnvelope<AcolhimentoInstitucionalResponse> | AcolhimentoInstitucionalResponse
    >(buildUrl(`/api/prontuario/acolhimento-institucional/${id}`), payload);
  },
};
