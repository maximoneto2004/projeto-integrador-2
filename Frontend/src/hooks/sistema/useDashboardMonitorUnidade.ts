import { useQuery } from "@tanstack/react-query";
import { dashboardMonitorUnidadeService, type DashboardMonitorUnidadeParams } from "@/services/sistema/dashboardMonitorUnidadeService";
import type { DashboardMonitorUnidadeResult } from "@/types/api";

const queryKeys = {
  dashboard: (params: DashboardMonitorUnidadeParams) => ["dashboard-monitor-unidade", params] as const,
};

export function useDashboardMonitorUnidade(params: DashboardMonitorUnidadeParams) {
  return useQuery({
    queryKey: queryKeys.dashboard(params),
    enabled: !!params.unidade_id,
    queryFn: async () => {
      const { data } = await dashboardMonitorUnidadeService.obter(params);
      if (!data.success || !data.results) {
        throw new Error(data?.mensagem || "Falha ao carregar dashboard do monitor de unidade");
      }
      return data.results as DashboardMonitorUnidadeResult;
    },
  });
}
