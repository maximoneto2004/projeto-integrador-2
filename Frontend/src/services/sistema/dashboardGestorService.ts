import { api } from "@/services/api";

export type DashboardGestorParams = {
  data_inicio?: string;
  data_fim?: string;
};

export type DashboardGestorUnidade = {
  unidade_id: string;
  nome_unidade: string;
  total_agendamentos: number;
  consultas: number;
  em_atendimento: number;
  ativados_ausentes: number;
  nao_compareceu: number;
  taxa_nao_comparecimento: number;
  total_profissionais: number;
  duracao_media_atendimento_min: number;
  tempo_medio_espera_min: number;
  pct_dentro_meta: number | null;
  fila_aguardando: number;
  max_vagas: number;
  vagas_ocupadas: number;
  ocupacao: number | null;
  rupturas: number;
};

export type DashboardGestorKpis = {
  consultas: number;
  agendamentos: number;
  absenteismo: number;
  pct_dentro_meta: number | null;
  tempo_medio_espera_min: number | null;
  tempo_medio_atendimento_min: number | null;
  ocupacao: number | null;
};

export type DashboardGestorSemana = {
  semana: string;
  consultas: number;
  absenteismo: number | null;
  pct_dentro_meta: number | null;
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
  comparativo: {
    atual: DashboardGestorKpis;
    anterior: DashboardGestorKpis;
    anterior_inicio: string;
    anterior_fim: string;
  };
  serie_semanal: DashboardGestorSemana[];
  demanda_capacidade: Array<{ tipo_servico: string; vagas: number; agendamentos: number }>;
  faixa_etaria: Array<{ faixa: string; consultas: number }>;
  rupturas: number;
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
