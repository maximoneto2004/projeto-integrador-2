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

export type AcompanhamentoCreasPayload = {
  prontuario: string;
  data_inicio: string;
  data_final?: string;
  identificao_creas: string;
};

export type AcompanhamentoCreasResponse = AcompanhamentoCreasPayload & {
  id: string;
};

export type SituacaoViolenciaPayload = {
  prontuario: string;
  trabalho_infantil?: string;
  negligencia?: string;
  situacao_trabalho_rua?: string;
  exploracao_sexual?: string;
  violencia_sexual?: string;
  violencia_fisica?: string;
  violencia_psicologica?: string;
  trafico_pessoa?: string;
  idoso_negligencia?: string;
  deficiente_negligencia?: string;
  violencia_patrimonial?: string;
  violencia_vivenciada?: string;
  acompanhamento_creas?: string[];
  observacao?: string;
};

export type SituacaoViolenciaResponse = SituacaoViolenciaPayload & {
  id: string;
};

export const situacaoViolenciaService = {
  listar(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<SituacaoViolenciaResponse[] | string[]>
      | SituacaoViolenciaResponse[]
      | string[]
    >(buildUrl("/api/prontuario/situacao-violencia/"), { params });
  },
  criar(payload: SituacaoViolenciaPayload) {
    return api.post<ApiEnvelope<SituacaoViolenciaResponse> | SituacaoViolenciaResponse>(
      buildUrl("/api/prontuario/situacao-violencia/"),
      payload
    );
  },
  atualizar(id: string, payload: Partial<SituacaoViolenciaPayload>) {
    return api.patch<ApiEnvelope<SituacaoViolenciaResponse> | SituacaoViolenciaResponse>(
      buildUrl(`/api/prontuario/situacao-violencia/${id}`),
      payload
    );
  },
  listarAcompanhamentoCreas(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<AcompanhamentoCreasResponse[] | string[]>
      | AcompanhamentoCreasResponse[]
      | string[]
    >(buildUrl("/api/prontuario/acompanhamento-creas/"), { params });
  },
  criarAcompanhamentoCreas(payload: AcompanhamentoCreasPayload) {
    return api.post<ApiEnvelope<AcompanhamentoCreasResponse> | AcompanhamentoCreasResponse>(
      buildUrl("/api/prontuario/acompanhamento-creas/"),
      payload
    );
  },
  removerAcompanhamentoCreas(id: string) {
    return api.delete<ApiEnvelope<string> | string>(buildUrl(`/api/prontuario/acompanhamento-creas/${id}`));
  },
};

