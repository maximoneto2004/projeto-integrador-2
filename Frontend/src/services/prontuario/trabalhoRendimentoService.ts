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

export type TrabalhoRendimentoMembroPayload = {
  prontuario: string;
  membro: string;
  condicao_ocupacao?: string;
  vinculo_empregatico?: string;
  renda_individual?: number;
  carteira_assinada?: boolean;
  aposentado_pensionista?: boolean;
  qualificacao_profissional?: string[];
};

export type TrabalhoRendimentoMembroResponse = TrabalhoRendimentoMembroPayload & {
  id: string;
};

export type TransferenciaRendaPayload = {
  prontuario: string;
  beneficio?: string;
  valor?: number;
};

export type TransferenciaRendaResponse = TransferenciaRendaPayload & {
  id: string;
};

export type TrabalhoRendimentoPayload = {
  prontuario: string;
  trabalho_rendimento_membro?: string[];
  renda_total?: number;
  renda_per_capita?: number;
  transferencia_renda_familia?: string[];
  parecer?: string;
};

export type TrabalhoRendimentoResponse = TrabalhoRendimentoPayload & {
  id: string;
};

export const trabalhoRendimentoService = {
  listarMembro(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<TrabalhoRendimentoMembroResponse[] | string[]>
      | TrabalhoRendimentoMembroResponse[]
      | string[]
    >(buildUrl("/api/prontuario/trabalho-rendimento-membro/"), { params });
  },
  criarMembro(payload: TrabalhoRendimentoMembroPayload) {
    return api.post<
      | ApiEnvelope<TrabalhoRendimentoMembroResponse>
      | TrabalhoRendimentoMembroResponse
    >(buildUrl("/api/prontuario/trabalho-rendimento-membro/"), payload);
  },
  atualizarMembro(id: string, payload: Partial<TrabalhoRendimentoMembroPayload>) {
    return api.patch<
      | ApiEnvelope<TrabalhoRendimentoMembroResponse>
      | TrabalhoRendimentoMembroResponse
    >(buildUrl(`/api/prontuario/trabalho-rendimento-membro/${id}`), payload);
  },

  listarTransferencia(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<TransferenciaRendaResponse[] | string[]>
      | TransferenciaRendaResponse[]
      | string[]
    >(buildUrl("/api/prontuario/transferencia-renda/"), { params });
  },
  criarTransferencia(payload: TransferenciaRendaPayload) {
    return api.post<
      | ApiEnvelope<TransferenciaRendaResponse>
      | TransferenciaRendaResponse
    >(buildUrl("/api/prontuario/transferencia-renda/"), payload);
  },
  atualizarTransferencia(id: string, payload: Partial<TransferenciaRendaPayload>) {
    return api.patch<
      | ApiEnvelope<TransferenciaRendaResponse>
      | TransferenciaRendaResponse
    >(buildUrl(`/api/prontuario/transferencia-renda/${id}`), payload);
  },
  removerTransferencia(id: string) {
    return api.delete<ApiEnvelope<string> | string>(buildUrl(`/api/prontuario/transferencia-renda/${id}`));
  },

  listar(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<TrabalhoRendimentoResponse[] | string[]>
      | TrabalhoRendimentoResponse[]
      | string[]
    >(buildUrl("/api/prontuario/trabalho-rendimento/"), { params });
  },
  criar(payload: TrabalhoRendimentoPayload) {
    return api.post<ApiEnvelope<TrabalhoRendimentoResponse> | TrabalhoRendimentoResponse>(
      buildUrl("/api/prontuario/trabalho-rendimento/"),
      payload
    );
  },
  atualizar(id: string, payload: Partial<TrabalhoRendimentoPayload>) {
    return api.patch<ApiEnvelope<TrabalhoRendimentoResponse> | TrabalhoRendimentoResponse>(
      buildUrl(`/api/prontuario/trabalho-rendimento/${id}`),
      payload
    );
  },
};
