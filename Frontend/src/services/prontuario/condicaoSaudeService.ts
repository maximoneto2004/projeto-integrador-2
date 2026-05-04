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

const buildUrl = (path: string) => (PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}${path}` : path);

export type SaudeCuidadosMembroPayload = {
  prontuario: string;
  membro: string;
  deficiencia?: string;
  acompanhamento?: string;
  doencas_graves?: string;
  cuidados_terceiros?: string;
  realiza_cuidados?: string;
  remedio?: string;
  alcool?: string;
  drogas?: string;
  substancia?: string;
  tratamentos?: string;
  medicamentos?: string;
  gestante?: string;
  meses_gestante?: number;
};

export type SaudeCuidadosMembroResponse = SaudeCuidadosMembroPayload & {
  id: string;
};

export type CondicoesDeSaudePayload = {
  prontuario: string;
  condicoes_saude_membro?: string[];
  descumprimento_condicionalidade?: string[];
  inseguranca_alimentar?: string;
  observacoes?: string;
};

export type CondicoesDeSaudeResponse = CondicoesDeSaudePayload & {
  id: string;
};

export type DescumprimentoCondicionalidadesBolsaPayload = {
  prontuario: string;
  membro: string;
  data_ocorrencia?: string;
  efeito_codigo: string;
};

export type DescumprimentoCondicionalidadesBolsaResponse =
  DescumprimentoCondicionalidadesBolsaPayload & {
    id: string;
  };

export const condicaoSaudeService = {
  listarMembro(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<SaudeCuidadosMembroResponse[] | string[]>
      | SaudeCuidadosMembroResponse[]
      | string[]
    >(buildUrl("/api/prontuario/saude-cuidados-membro/"), { params });
  },
  criarMembro(payload: SaudeCuidadosMembroPayload) {
    return api.post<
      | ApiEnvelope<SaudeCuidadosMembroResponse>
      | SaudeCuidadosMembroResponse
    >(buildUrl("/api/prontuario/saude-cuidados-membro/"), payload);
  },
  atualizarMembro(id: string, payload: Partial<SaudeCuidadosMembroPayload>) {
    return api.patch<
      | ApiEnvelope<SaudeCuidadosMembroResponse>
      | SaudeCuidadosMembroResponse
    >(buildUrl(`/api/prontuario/saude-cuidados-membro/${id}`), payload);
  },
  listar(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<CondicoesDeSaudeResponse[] | string[]>
      | CondicoesDeSaudeResponse[]
      | string[]
    >(buildUrl("/api/prontuario/condicoes-de-saude/"), { params });
  },
  criar(payload: CondicoesDeSaudePayload) {
    return api.post<ApiEnvelope<CondicoesDeSaudeResponse> | CondicoesDeSaudeResponse>(
      buildUrl("/api/prontuario/condicoes-de-saude/"),
      payload
    );
  },
  atualizar(id: string, payload: Partial<CondicoesDeSaudePayload>) {
    return api.patch<ApiEnvelope<CondicoesDeSaudeResponse> | CondicoesDeSaudeResponse>(
      buildUrl(`/api/prontuario/condicoes-de-saude/${id}`),
      payload
    );
  },
  listarDescumprimentoCondicionalidadesBolsa(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<DescumprimentoCondicionalidadesBolsaResponse[] | string[]>
      | DescumprimentoCondicionalidadesBolsaResponse[]
      | string[]
    >(buildUrl("/api/prontuario/descumprimento-condicionalidades-bolsa/"), { params });
  },
  criarDescumprimentoCondicionalidadesBolsa(payload: DescumprimentoCondicionalidadesBolsaPayload) {
    return api.post<
      | ApiEnvelope<DescumprimentoCondicionalidadesBolsaResponse>
      | DescumprimentoCondicionalidadesBolsaResponse
    >(buildUrl("/api/prontuario/descumprimento-condicionalidades-bolsa/"), payload);
  },
  atualizarDescumprimentoCondicionalidadesBolsa(
    id: string,
    payload: Partial<DescumprimentoCondicionalidadesBolsaPayload>
  ) {
    return api.patch<
      | ApiEnvelope<DescumprimentoCondicionalidadesBolsaResponse>
      | DescumprimentoCondicionalidadesBolsaResponse
    >(buildUrl(`/api/prontuario/descumprimento-condicionalidades-bolsa/${id}`), payload);
  },
  removerDescumprimentoCondicionalidadesBolsa(id: string) {
    return api.delete<ApiEnvelope<string> | string>(
      buildUrl(`/api/prontuario/descumprimento-condicionalidades-bolsa/${id}`)
    );
  },
};
