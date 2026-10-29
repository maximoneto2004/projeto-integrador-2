import { useQuery } from "@tanstack/react-query";
import { meuDiaService, type MeuDiaParams } from "@/services/sistema/meuDiaService";

const queryKeys = {
  meuDia: (params: MeuDiaParams) => ["dashboard-profissional", params] as const,
};

export function useMeuDia(params: MeuDiaParams) {
  return useQuery({
    queryKey: queryKeys.meuDia(params),
    enabled: !!params.unidade_id,
    // A agenda do dia muda enquanto o profissional atende.
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await meuDiaService.obter(params);
      if (!data.success || !data.results) {
        throw new Error(data?.mensagem || "Falha ao carregar o painel Meu Dia");
      }
      return data.results;
    },
  });
}
