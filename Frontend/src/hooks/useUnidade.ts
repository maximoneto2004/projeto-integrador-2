import { useQuery } from "@tanstack/react-query";
import { unidadeService } from "@/services/sistema/unidadeService";

export function useUnidades() {
  return useQuery({
    queryKey: ["unidades"],
    queryFn: unidadeService.listar,
  });
}
