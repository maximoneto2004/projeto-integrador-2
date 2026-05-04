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

export type AnotacaoPlanejamentoPayload = {
  prontuario: string;
  anotacao: string;
  tecnico_responsavel: string;
};

export type AnotacaoPlanejamentoResponse = AnotacaoPlanejamentoPayload & {
  id: string;
  created_at?: string;
};

export type NovoIngressoPayload = {
  prontuario: string;
  data_ingresso: string;
  motivo: string;
  observacoes?: string;
};

export type NovoIngressoResponse = NovoIngressoPayload & {
  id: string;
  created_at?: string;
};

export type RegistroDesligamentoPayload = {
  prontuario: string;
  data_desligamento: string;
  motivo: string;
  observacoes?: string;
};

export type RegistroDesligamentoResponse = RegistroDesligamentoPayload & {
  id: string;
  created_at?: string;
};

export type EvolucaoAcompanhamentoPayload = {
  prontuario: string;
  anotacao_acompanhamento?: string[];
  novo_ingresso?: string[];
  registros_desligamentos?: string[];
};

export type EvolucaoAcompanhamentoResponse = EvolucaoAcompanhamentoPayload & {
  id: string;
};

export const evolucaoAcompanhamentoService = {
  listarAnotacaoPlanejamento(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<AnotacaoPlanejamentoResponse[] | string[]>
      | AnotacaoPlanejamentoResponse[]
      | string[]
    >(buildUrl("/api/prontuario/anotacao-planejamento/"), { params });
  },
  criarAnotacaoPlanejamento(payload: AnotacaoPlanejamentoPayload) {
    return api.post<ApiEnvelope<AnotacaoPlanejamentoResponse> | AnotacaoPlanejamentoResponse>(
      buildUrl("/api/prontuario/anotacao-planejamento/"),
      payload
    );
  },
  atualizarAnotacaoPlanejamento(id: string, payload: Partial<AnotacaoPlanejamentoPayload>) {
    return api.patch<ApiEnvelope<AnotacaoPlanejamentoResponse> | AnotacaoPlanejamentoResponse>(
      buildUrl(`/api/prontuario/anotacao-planejamento/${id}`),
      payload
    );
  },
  listarNovoIngresso(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<NovoIngressoResponse[] | string[]>
      | NovoIngressoResponse[]
      | string[]
    >(buildUrl("/api/prontuario/novo-ingresso/"), { params });
  },
  criarNovoIngresso(payload: NovoIngressoPayload) {
    return api.post<ApiEnvelope<NovoIngressoResponse> | NovoIngressoResponse>(
      buildUrl("/api/prontuario/novo-ingresso/"),
      payload
    );
  },
  atualizarNovoIngresso(id: string, payload: Partial<NovoIngressoPayload>) {
    return api.patch<ApiEnvelope<NovoIngressoResponse> | NovoIngressoResponse>(
      buildUrl(`/api/prontuario/novo-ingresso/${id}`),
      payload
    );
  },
  listarRegistroDesligamento(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<RegistroDesligamentoResponse[] | string[]>
      | RegistroDesligamentoResponse[]
      | string[]
    >(buildUrl("/api/prontuario/registro-desligamento/"), { params });
  },
  criarRegistroDesligamento(payload: RegistroDesligamentoPayload) {
    return api.post<ApiEnvelope<RegistroDesligamentoResponse> | RegistroDesligamentoResponse>(
      buildUrl("/api/prontuario/registro-desligamento/"),
      payload
    );
  },
  atualizarRegistroDesligamento(id: string, payload: Partial<RegistroDesligamentoPayload>) {
    return api.patch<ApiEnvelope<RegistroDesligamentoResponse> | RegistroDesligamentoResponse>(
      buildUrl(`/api/prontuario/registro-desligamento/${id}`),
      payload
    );
  },
  listarEvolucaoAcompanhamento(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<EvolucaoAcompanhamentoResponse[] | string[]>
      | EvolucaoAcompanhamentoResponse[]
      | string[]
    >(buildUrl("/api/prontuario/evolucao-acompanhamento/"), { params });
  },
  criarEvolucaoAcompanhamento(payload: EvolucaoAcompanhamentoPayload) {
    return api.post<
      ApiEnvelope<EvolucaoAcompanhamentoResponse> | EvolucaoAcompanhamentoResponse
    >(buildUrl("/api/prontuario/evolucao-acompanhamento/"), payload);
  },
  atualizarEvolucaoAcompanhamento(
    id: string,
    payload: Partial<EvolucaoAcompanhamentoPayload>
  ) {
    return api.patch<
      ApiEnvelope<EvolucaoAcompanhamentoResponse> | EvolucaoAcompanhamentoResponse
    >(buildUrl(`/api/prontuario/evolucao-acompanhamento/${id}`), payload);
  },
};
