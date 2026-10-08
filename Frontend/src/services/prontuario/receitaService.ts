import { api, urlServidorApi } from "@/services/api";

export type StatusDispensacao = "PENDENTE" | "PARCIAL" | "DISPENSADO";

export type ReceitaMedicamentoPayload = {
  medicamento: string;
  dosagem?: string;
  frequencia: string;
  duracao: string;
  instrucoes?: string;
  quantidade_prescrita: number;
};

export type ReceitaMedicamento = Omit<ReceitaMedicamentoPayload, "medicamento"> & {
  id: string;
  medicamento: string | null;
  nome: string;
  dosagem: string;
  controlado: boolean;
  quantidade_prescrita: number | null;
  quantidade_dispensada: number;
  quantidade_restante: number;
  status_dispensacao: StatusDispensacao;
  status_dispensacao_display: string;
  legado: boolean;
};

export type Receita = {
  id: string;
  agendamento: string;
  cidadao_nome: string;
  cidadao_cpf: string;
  unidade_nome?: string;
  profissional_nome?: string;
  data_emissao: string;
  validade_dias: number;
  data_validade: string | null;
  vencida: boolean;
  status_dispensacao: StatusDispensacao;
  diagnostico?: string;
  observacoes?: string;
  medicamentos: ReceitaMedicamento[];
};

export type ReceitaPayload = {
  agendamento: string;
  /** Obrigatório: o médico informa se o cidadão retira o medicamento agora (vai para a fila da farmácia). */
  retirada_imediata: boolean;
  validade_dias?: number;
  diagnostico?: string;
  observacoes?: string;
  medicamentos: ReceitaMedicamentoPayload[];
};

export type ReceitaListParams = {
  search?: string;
  agendamento?: string;
  cidadao?: string;
  medicamento?: string;
  vigente?: boolean;
  pendente_dispensacao?: boolean;
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

const url = urlServidorApi;

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
