import { useQuery } from "@tanstack/react-query";
import { dashboardGestorService, type DashboardGestorParams } from "@/services/sistema/dashboardGestorService";

const queryKeys = {
    dashboard: (params: DashboardGestorParams) => ["dashboard-gestor", params] as const,
};

export function useDashboardGestor(params: DashboardGestorParams){
    return useQuery({
        queryKey: queryKeys.dashboard(params),
        enabled: !!params.data_inicio && !!params.data_fim,
        queryFn: async () => {
            const { data } = await dashboardGestorService.obter(params);
            if (!data.success || !data.results) {
                throw new Error("Falha ao carregar o painel da rede");
            }
            return data.results;
        },
    })
}
