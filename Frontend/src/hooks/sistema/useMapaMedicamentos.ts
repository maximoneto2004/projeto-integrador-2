import { useQuery } from "@tanstack/react-query";
import { api } from "@/services/api";
import type { MapaMedicamentosParams, MapaMedicamentosResult } from "@/types/mapaAssistencial";

export function useMapaMedicamentos(params: MapaMedicamentosParams, enabled: boolean) {
  return useQuery({
    queryKey: ["mapa-medicamentos", params],
    enabled: enabled && !!params.data_inicio && !!params.data_fim && params.data_inicio <= params.data_fim,
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; results: MapaMedicamentosResult }>("/mapa/medicamentos/", { params });
      if (!data.success) throw new Error("Não foi possível carregar a demanda de medicamentos.");
      return data.results;
    },
  });
}
