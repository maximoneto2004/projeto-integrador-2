import { useQuery } from "@tanstack/react-query";
import { dashboardSupervisorService, type DashboardSupervisorParams } from "@/services/sistema/dashboardSupervisorService";
import type { DashboardSupervisorResult } from "@/types/api";

const queryKeys = {
  dashboard: (params: DashboardSupervisorParams) => ["dashboard-supervisor", params] as const,
};

export function useDashboardSupervisor(params: DashboardSupervisorParams) {
  return useQuery({
    queryKey: queryKeys.dashboard(params),
    enabled: !!params.unidade_id,
    queryFn: async () => {
      const { data } = await dashboardSupervisorService.obter(params);
      if (!data.success || !data.results) {
        throw new Error(data?.mensagem || "Falha ao carregar dashboard do supervisor");
      }
      return data.results as DashboardSupervisorResult;
    },
  });
}
