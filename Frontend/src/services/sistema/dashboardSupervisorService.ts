import { api } from "@/services/api";
import type { DashboardSupervisorResult } from "@/types/api";

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

export const dashboardSupervisorService = {
  obter(params: DashboardSupervisorParams) {
    return api.get<DashboardSupervisorResponse>(`/dashboard-supervisor/`, { params });
  },
};
