import { useQuery } from "@tanstack/react-query";
import { farmaciaService } from "@/services/sistema/farmaciaService";

export function useFarmacia(unidadeId: string) {
  return useQuery({
    queryKey: ["dashboard-farmacia", unidadeId] as const,
    enabled: !!unidadeId,
    // A fila de retirada muda a cada paciente que sai do consultório.
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await farmaciaService.obter(unidadeId);
      if (!data.success || !data.results) {
        throw new Error(data?.mensagem || "Falha ao carregar o painel da farmácia");
      }
      return data.results;
    },
  });
}
