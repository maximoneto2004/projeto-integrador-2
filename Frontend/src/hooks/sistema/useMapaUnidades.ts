import { useQuery } from "@tanstack/react-query";
import {
  mapaUnidadesService,
  type MapaUnidadeApi,
  type MapaUnidadesListParams,
} from "@/services/sistema/mapaUnidadesService";

const mapaUnidadesKeys = {
  list: (params?: MapaUnidadesListParams) => ["mapa-unidades", "list", params ?? {}] as const,
  detail: (id: string, params?: Omit<MapaUnidadesListParams, "nome" | "bairro">) =>
    ["mapa-unidades", "detail", id, params ?? {}] as const,
};

export function useMapaUnidades(params?: MapaUnidadesListParams) {
  return useQuery<MapaUnidadeApi[]>({
    queryKey: mapaUnidadesKeys.list(params),
    queryFn: () => mapaUnidadesService.listar(params),
  });
}

export function useMapaUnidade(id?: string, params?: Omit<MapaUnidadesListParams, "nome" | "bairro">) {
  return useQuery<MapaUnidadeApi | null>({
    queryKey: mapaUnidadesKeys.detail(id ?? "", params),
    enabled: Boolean(id),
    queryFn: () => mapaUnidadesService.obter(id as string, params),
  });
}

