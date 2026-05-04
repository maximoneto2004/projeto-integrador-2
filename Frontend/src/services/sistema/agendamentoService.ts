import type { AxiosResponse } from "axios";
import { api } from "../api";
import {AuthUser} from "@/types/api";
import type {
  AgendaVaga,
  AgendaVagaListItem,
  AgendamentoRequest,
  AgendamentoResponse,
  PaginatedResponse,
} from "@/types/api";

type ApiEnvelope<T> = {
  success: boolean;
  result: T;
  mensagem?: string;
};

export type AgendamentoListParams = Partial<{
  data: string;
  unidade: string;
  servico: string;
  situacao: string;
  atendente: string;
  cpf: string;
  nome: string;
  page: number;
  page_size: number;
  limit: number;
  offset: number;

  
}>;

const API_URL = import.meta.env.VITE_API_URL
const raw = sessionStorage.getItem("auth_user_session");
const user: AuthUser | null = raw ? JSON.parse(raw) : null;
const atendente156 = user?.grupos?.some((grupo) => grupo === "atendente 156");



export const agendamentoService = {
  listarVagas(params: { data?: string; tipo_servico?: string; unidade?: string }) {
    return api.get<ApiEnvelope<AgendaVaga[] | AgendaVagaListItem[]>>(`${API_URL}/vagas/`, {
      params,
    });
  },

  listar(params?: AgendamentoListParams) {
    const finalParams: AgendamentoListParams = {
      ...params,
      ...(atendente156 && { origem: "156" }),
    };

    return api.get<
      ApiEnvelope<AgendamentoResponse[] | PaginatedResponse<AgendamentoResponse>>
    >(`${API_URL}/agendamentos/`, {
      params: finalParams,
    });
  },

  criar(payload: AgendamentoRequest): Promise<AxiosResponse<ApiEnvelope<AgendamentoResponse>>> {
    return api.post<ApiEnvelope<AgendamentoResponse>>(`${API_URL}/agendamentos/`, payload);
  },

  obter(id: string) {
    return api.get<ApiEnvelope<AgendamentoResponse>>(`${API_URL}/agendamentos/${id}/`);
  },

  atualizar(
    id: string,
    payload: Partial<AgendamentoRequest>,
  ): Promise<AxiosResponse<ApiEnvelope<AgendamentoResponse>>> {
    return api.patch<ApiEnvelope<AgendamentoResponse>>(`${API_URL}/agendamentos/${id}/`, payload);
  },

  ativarAusente(id: string) {
    return api.post<{ detail: string }>(`${API_URL}/${id}/ativar-ausente/`, {});
  },

  cancelarAgendamento(id: string) {
    return api.patch<ApiEnvelope<AgendamentoResponse>>(`${API_URL}/agendamentos/${id}/`, {
      situacao: "CANCELADO_CRAS",
    });
  },
};
