import { useQuery } from "@tanstack/react-query";
import { dashboardGestorService, type DashboardGestorParams } from "@/services/sistema/dashboardGestorService";
import type { DashboardGestorResult } from "@/types/api";

const queryKeys = {
    dashboard: (params: DashboardGestorParams) => ["dashboard-gestor", params] as const,
};

export function useDashboardGestor(params: DashboardGestorParams){
    return useQuery({
        queryKey: queryKeys.dashboard(params),
        enabled: !!params.unidade_id,
        queryFn: async () => {
            const { data } = await dashboardGestorService.obter(params);
            if (!data.success || !data.results) {
                throw new Error(data?.mensagem || "Falha ao carregar dashboard do gestor");
            }
            return data.results as DashboardGestorResult;
        },
    })
}