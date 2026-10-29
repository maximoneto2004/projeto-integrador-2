import { useQuery } from "@tanstack/react-query";
import type { FeatureCollection } from "geojson";
import { api } from "@/services/api";
import type { MapaBairrosResult } from "@/types/mapaAssistencial";

type Periodo = { data_inicio: string; data_fim: string };

export function useMapaBairros(params: Periodo, enabled: boolean) {
  return useQuery({
    queryKey: ["mapa-bairros", params],
    enabled: enabled && !!params.data_inicio && !!params.data_fim && params.data_inicio <= params.data_fim,
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; results: MapaBairrosResult }>("/mapa/bairros/indicadores/", { params });
      if (!data.success) throw new Error("Não foi possível carregar os indicadores por bairro.");
      return data.results;
    },
  });
}

// Os limites dos bairros não mudam durante o uso: baixa uma vez por sessão.
export function useBairrosGeojson(enabled: boolean) {
  return useQuery({
    queryKey: ["mapa-bairros-geojson"],
    enabled,
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await api.get<FeatureCollection>("/mapa/bairros.geojson");
      return data;
    },
  });
}
