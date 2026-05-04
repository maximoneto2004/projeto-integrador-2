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

export type BeneficioEventualPayload = {
  prontuario: string;
  beneficio: string;
  data_beneficio?: string;
  observacao?: string;
  registro_nascimento?: string;
  cpf_falecido?: string;
};

export type BeneficioEventualResponse = BeneficioEventualPayload & {
  id: string;
  created_at?: string;
};

export type ConvivenciaFortalecimentoPayload = {
  prontuario: string;
  membro: string;
  servico: string;
  data_inicio: string;
  unidade_realizacao: string;
};

export type ConvivenciaFortalecimentoResponse = ConvivenciaFortalecimentoPayload & {
  id: string;
};

export type ChoiceOption = {
  value: string;
  label: string;
};

export type BeneficiosServicosPayload = {
  prontuario: string;
  beneficios_eventuais?: string[];
  convivencia_e_fortalecimento?: string[];
};

export type BeneficiosServicosResponse = BeneficiosServicosPayload & {
  id: string;
};

export const beneficiosServicosService = {
  listarBeneficiosEventuais(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<BeneficioEventualResponse[] | string[]>
      | BeneficioEventualResponse[]
      | string[]
    >(buildUrl("/api/prontuario/beneficios-eventuais/"), { params });
  },
  criarBeneficioEventual(payload: BeneficioEventualPayload) {
    return api.post<ApiEnvelope<BeneficioEventualResponse> | BeneficioEventualResponse>(
      buildUrl("/api/prontuario/beneficios-eventuais/"),
      payload
    );
  },
  atualizarBeneficioEventual(id: string, payload: Partial<BeneficioEventualPayload>) {
    return api.patch<ApiEnvelope<BeneficioEventualResponse> | BeneficioEventualResponse>(
      buildUrl(`/api/prontuario/beneficios-eventuais/${id}`),
      payload
    );
  },
  removerBeneficioEventual(id: string) {
    return api.delete<ApiEnvelope<string> | string>(buildUrl(`/api/prontuario/beneficios-eventuais/${id}`));
  },
  listarConvivenciaFortalecimento(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<ConvivenciaFortalecimentoResponse[] | string[]>
      | ConvivenciaFortalecimentoResponse[]
      | string[]
    >(buildUrl("/api/prontuario/convivenvia-fortalecimento/"), { params });
  },
  listarUnidadeRealizacaoOpcoes() {
    return api.get<ApiEnvelope<ChoiceOption[] | string[]> | ChoiceOption[] | string[]>(
      buildUrl("/api/prontuario/convivenvia-fortalecimento/unidade-realizacao-opcoes/")
    );
  },
  criarConvivenciaFortalecimento(payload: ConvivenciaFortalecimentoPayload) {
    return api.post<ApiEnvelope<ConvivenciaFortalecimentoResponse> | ConvivenciaFortalecimentoResponse>(
      buildUrl("/api/prontuario/convivenvia-fortalecimento/"),
      payload
    );
  },
  atualizarConvivenciaFortalecimento(id: string, payload: Partial<ConvivenciaFortalecimentoPayload>) {
    return api.patch<ApiEnvelope<ConvivenciaFortalecimentoResponse> | ConvivenciaFortalecimentoResponse>(
      buildUrl(`/api/prontuario/convivenvia-fortalecimento/${id}`),
      payload
    );
  },
  removerConvivenciaFortalecimento(id: string) {
    return api.delete<ApiEnvelope<string> | string>(buildUrl(`/api/prontuario/convivenvia-fortalecimento/${id}`));
  },
  listarBeneficiosServicos(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<BeneficiosServicosResponse[] | string[]>
      | BeneficiosServicosResponse[]
      | string[]
    >(buildUrl("/api/prontuario/beneficios-servicos/"), { params });
  },
  criarBeneficiosServicos(payload: BeneficiosServicosPayload) {
    return api.post<ApiEnvelope<BeneficiosServicosResponse> | BeneficiosServicosResponse>(
      buildUrl("/api/prontuario/beneficios-servicos/"),
      payload
    );
  },
  atualizarBeneficiosServicos(id: string, payload: Partial<BeneficiosServicosPayload>) {
    return api.patch<ApiEnvelope<BeneficiosServicosResponse> | BeneficiosServicosResponse>(
      buildUrl(`/api/prontuario/beneficios-servicos/${id}`),
      payload
    );
  },
};
