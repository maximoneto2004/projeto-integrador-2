import { useQuery } from "@tanstack/react-query";
import { dashboardSupervisorService, type AtendimentosSlaParams } from "@/services/sistema/dashboardSupervisorService";

export function useAtendimentosSla(params: AtendimentosSlaParams, enabled: boolean) {
  return useQuery({
    queryKey: ["supervisor-atendimentos-sla", params],
    enabled: enabled && !!params.unidade_id,
    queryFn: async () => (await dashboardSupervisorService.atendimentos(params)).data,
  });
}
