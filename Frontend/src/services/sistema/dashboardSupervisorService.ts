import { api } from "@/services/api";
import type { DashboardSupervisorResult } from "@/types/api";
import type { AtendimentosSlaResponse } from "@/types/sla";

type DashboardSupervisorResponse = {
  success: boolean;
  results: DashboardSupervisorResult;
  mensagem?: string;
};

export type DashboardSupervisorParams = {
  unidade_id: string;
  data_inicio: string;
  data_fim: string;
};

export type AtendimentosSlaParams = DashboardSupervisorParams & {
  limit: number;
  offset: number;
  busca?: string;
  profissional_id?: string;
  servico_id?: string;
};

export const dashboardSupervisorService = {
  atendimentos(params: AtendimentosSlaParams) {
    return api.get<AtendimentosSlaResponse>("/dashboard-supervisor/atendimentos/", { params });
  },
  obter(params: DashboardSupervisorParams) {
    return api.get<DashboardSupervisorResponse>(`/dashboard-supervisor/`, { params });
  },
};
