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

export type MedidaSocioeducativaMembroPayload = {
  prontuario: string;
  membro: string;
  tipo_medida: string;
  data_inicio: string;
  data_termino?: string;
  numero_processo: string;
};

export type MedidaSocioeducativaMembroResponse = MedidaSocioeducativaMembroPayload & {
  id: string;
};

export type AcompanhamentoLAPSCPayload = {
  prontuario: string;
  membro: string;
  acompanhado?: "SIM" | "NAO" | "";
  data_anotacao?: string;
  observacao?: string;
  observação?: string;
};

export type AcompanhamentoLAPSCResponse = AcompanhamentoLAPSCPayload & {
  id: string;
};

export type MedidaSocioeducativaPayload = {
  prontuario: string;
  membro_socio_educativo?: string[];
  acompanhamento_LAPSC_membro?: string[];
  contatos_PSC?: string;
};

export type MedidaSocioeducativaResponse = MedidaSocioeducativaPayload & {
  id: string;
};

export const medidaSocioeducativaService = {
  listarMedidaMembro(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<MedidaSocioeducativaMembroResponse[] | string[]>
      | MedidaSocioeducativaMembroResponse[]
      | string[]
    >(buildUrl("/api/prontuario/medida-socioeducativa-membro/"), { params });
  },
  criarMedidaMembro(payload: MedidaSocioeducativaMembroPayload) {
    return api.post<
      ApiEnvelope<MedidaSocioeducativaMembroResponse> | MedidaSocioeducativaMembroResponse
    >(buildUrl("/api/prontuario/medida-socioeducativa-membro/"), payload);
  },
  atualizarMedidaMembro(id: string, payload: Partial<MedidaSocioeducativaMembroPayload>) {
    return api.patch<
      ApiEnvelope<MedidaSocioeducativaMembroResponse> | MedidaSocioeducativaMembroResponse
    >(buildUrl(`/api/prontuario/medida-socioeducativa-membro/${id}`), payload);
  },
  listarAcompanhamentoLAPSC(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<AcompanhamentoLAPSCResponse[] | string[]>
      | AcompanhamentoLAPSCResponse[]
      | string[]
    >(buildUrl("/api/prontuario/acompanhamento-lapsc/"), { params });
  },
  criarAcompanhamentoLAPSC(payload: AcompanhamentoLAPSCPayload) {
    return api.post<
      ApiEnvelope<AcompanhamentoLAPSCResponse> | AcompanhamentoLAPSCResponse
    >(buildUrl("/api/prontuario/acompanhamento-lapsc/"), payload);
  },
  atualizarAcompanhamentoLAPSC(id: string, payload: Partial<AcompanhamentoLAPSCPayload>) {
    return api.patch<
      ApiEnvelope<AcompanhamentoLAPSCResponse> | AcompanhamentoLAPSCResponse
    >(buildUrl(`/api/prontuario/acompanhamento-lapsc/${id}`), payload);
  },
  listarMedidaSocioeducativa(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<MedidaSocioeducativaResponse[] | string[]>
      | MedidaSocioeducativaResponse[]
      | string[]
    >(buildUrl("/api/prontuario/medida-socioeducativa/"), { params });
  },
  criarMedidaSocioeducativa(payload: MedidaSocioeducativaPayload) {
    return api.post<
      ApiEnvelope<MedidaSocioeducativaResponse> | MedidaSocioeducativaResponse
    >(buildUrl("/api/prontuario/medida-socioeducativa/"), payload);
  },
  atualizarMedidaSocioeducativa(id: string, payload: Partial<MedidaSocioeducativaPayload>) {
    return api.patch<
      ApiEnvelope<MedidaSocioeducativaResponse> | MedidaSocioeducativaResponse
    >(buildUrl(`/api/prontuario/medida-socioeducativa/${id}`), payload);
  },
};
