import { QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AvaliacaoPayload } from "@/types/avaliacao";
import { avaliacaoService } from "@/services/sistema/avaliacao";

export function useGetAvaliacao(agendamentoid?: string) {
  return useQuery({
    queryKey: ["avaliacao", agendamentoid],
    queryFn: () => avaliacaoService.listar({ agendamento: agendamentoid }),
    enabled: !!agendamentoid,
  });
}

export function useCreateAvaliacao() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: AvaliacaoPayload) => avaliacaoService.criar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avaliacao"] });
    },
  });
}

export function useUpdateAvaliacao() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => avaliacaoService.atualizar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avaliacao"] });
    },
  });
}
