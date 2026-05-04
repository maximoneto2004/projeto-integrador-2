import { api } from "@/services/api";

export type PessoaReferenciaPayload = {
  is_active?: boolean;
  prontuario?: string;
  pessoa_referencia?: string;
  logradouro?: string;
  numero?: string;
  cep?: string;
  complemento?: string;
  estado?: string;
  cidade?: string;
  ponto_referencia?: string;
  localizacao?: "URBANO" | "RURAL";
  abrigo?: boolean;
  forma_ingresso?: string;
  contato_encaminhamento?: string;
  razoes?: string;
  especifidade_familia?: string;
  povo_etinia?: string;
  bairro?: string;
  unidade?: string;
  beneficio?: string[];
};

export type PessoaReferenciaResponse = PessoaReferenciaPayload & { id?: string };

const PRONTUARIO_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");

type ApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  mensagem?: string;
  detail?: string;
};

export const pessoaReferenciaService = {
  listar(params?: { prontuario?: string }) {
    const url = PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}/api/prontuario/pessoa-referencia/` : "/api/prontuario/pessoa-referencia/";
    return api.get<ApiEnvelope<PessoaReferenciaResponse[] | string[]> | PessoaReferenciaResponse[] | string[]>(url, { params });
  },
  criar(payload: PessoaReferenciaPayload) {
    const url = PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}/api/prontuario/pessoa-referencia/` : "/api/prontuario/pessoa-referencia/";
    return api.post<ApiEnvelope<PessoaReferenciaResponse> | PessoaReferenciaResponse>(url, payload);
  },
  atualizar(id: string, payload: PessoaReferenciaPayload) {
    const url = PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}/api/prontuario/pessoa-referencia/${id}` : `/api/prontuario/pessoa-referencia/${id}/`;
    return api.patch<ApiEnvelope<PessoaReferenciaResponse> | PessoaReferenciaResponse>(url, payload);
  },
  obter(id: string) {
    const url = PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}/api/prontuario/pessoa-referencia/${id}` : `/api/prontuario/pessoa-referencia/${id}/`;
    return api.get<ApiEnvelope<PessoaReferenciaResponse> | PessoaReferenciaResponse>(url);
  },
};
