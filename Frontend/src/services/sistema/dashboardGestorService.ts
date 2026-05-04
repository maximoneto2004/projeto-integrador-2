import { api } from "@/services/api";

export type DashboardGestorParams = {
  data_inicio?: string;
  data_fim?: string;
};

export type DashboardGestorUnidade = {
  nome_unidade: string;
  total_agendamentos: number;
  em_atendimento: number;
  ativados_ausentes: number;
  total_profissionais: number;
  duracao_media_atendimento_min: number;
  fila_aguardando: number;
  max_vagas: number;
  vagas_ocupadas: number;
};

export type DashboardGestorPrioridade = {
  prioridade: string;
  unidade_name: string;
  total: number;
};

export type DashboardGestorResult = {
  data_inicio: string;
  data_fim: string;
  total_agendamentos: number;
  em_atendimento: number;
  aguardando_atendimento_ativado: number;
  ativado_ausente: number;
  nao_compareceu: number;
  cancelados: number;
  taxa_nao_comparecimento: number;
  ocupacao_media: number;
  pessoas_prioridades: DashboardGestorPrioridade[];
  tempo_medio: number;
  informacoes_unidade: DashboardGestorUnidade[];
};

export type DashboardGestorApiResponse = {
  success?: boolean;
  results?: DashboardGestorResult;
};

export const dashboardGestorService = {
  obter(params?: DashboardGestorParams) {
    return api.get<DashboardGestorApiResponse>("/dashboard-gestor/", { params });
  },
};
