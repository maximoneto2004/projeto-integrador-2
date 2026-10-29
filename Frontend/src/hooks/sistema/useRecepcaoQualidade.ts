import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { QualidadeResult, RecepcaoResult } from "@/types/api";

export function useRecepcao(unidadeId: string) {
  return useQuery({
    queryKey: ["dashboard-recepcao", unidadeId],
    enabled: !!unidadeId,
    // Quem chega e quem atrasa muda a cada minuto na recepção.
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; results: RecepcaoResult }>("/dashboard-recepcao/", {
        params: { unidade_id: unidadeId },
      });
      if (!data.success) throw new Error("Não foi possível carregar o fluxo do dia.");
      return data.results;
    },
  });
}

export function useQualidadeDados() {
  return useQuery({
    queryKey: ["qualidade-dados"],
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; results: QualidadeResult }>("/qualidade-dados/");
      if (!data.success) throw new Error("Não foi possível carregar a qualidade dos dados.");
      return data.results;
    },
  });
}
