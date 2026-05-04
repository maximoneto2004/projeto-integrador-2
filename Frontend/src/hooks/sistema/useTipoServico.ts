import { useQuery } from "@tanstack/react-query";
import { tipoServicoService } from "@/services/sistema/tipoServicoService";
import type { TipoServicoResumo } from "@/types/api";

const queryKeys = {
  lista: ["tipos-servico"] as const,
};

export function useTipoServico(enabled = true) {
  return useQuery<TipoServicoResumo[]>({
    queryKey: queryKeys.lista,
    queryFn: () => tipoServicoService.listar(),
    enabled,
  });
}
