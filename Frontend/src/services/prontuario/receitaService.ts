import { api } from "@/services/api";

export type ReceitaMedicamentoPayload = {
  nome: string;
  dosagem: string;
  frequencia: string;
  duracao: string;
  instrucoes?: string;
};

export type ReceitaMedicamento = ReceitaMedicamentoPayload & { id: string };

export type Receita = {
  id: string;
  agendamento: string;
  cidadao_nome: string;
  cidadao_cpf: string;
  profissional_nome?: string;
  data_emissao: string;
  diagnostico?: string;
  observacoes?: string;
  medicamentos: ReceitaMedicamento[];
};

export type ReceitaPayload = {
  agendamento: string;
  diagnostico?: string;
  observacoes?: string;
  medicamentos: ReceitaMedicamentoPayload[];
};

export type ReceitaListParams = {
  search?: string;
  agendamento?: string;
  cidadao?: string;
  limit?: number;
  offset?: number;
};

type ApiEnvelope<T> = {
  success?: boolean;
  count?: number;
  next?: string | null;
  previous?: string | null;
  result?: T;
  mensagem?: string;
  detail?: string;
};

const BASE = (import.meta.env.VITE_API_URL || "")
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/$/, "");

const url = (path: string) => (BASE ? `${BASE}${path}` : path);

export const receitaService = {
  listar(params?: ReceitaListParams) {
    return api.get<ApiEnvelope<Receita[]>>(url("/api/prontuario/receita/"), { params });
  },

  criar(payload: ReceitaPayload) {
    return api.post<ApiEnvelope<Receita>>(url("/api/prontuario/receita/"), payload);
  },

  buscar(id: string) {
    return api.get<ApiEnvelope<Receita>>(url(`/api/prontuario/receita/${id}/`));
  },

  remover(id: string) {
    return api.delete(url(`/api/prontuario/receita/${id}/`));
  },
};
