import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bloqueioHorarioService } from "@/services/sistema/bloqueioHorariosService";
import type { CriarBloqueioHorarioPayload } from "@/types/bloqueioHorario";

export function useBloqueiosHorario(params?: { unidade?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ["bloqueio_horario", params ?? {}],
    queryFn: () => bloqueioHorarioService.listar(params),
  });
}

export function useCreateBloqueioHorario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CriarBloqueioHorarioPayload) => bloqueioHorarioService.criar(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bloqueio_horario"] });
    },
  });
}

export function useUpdateBloqueioHorario() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => bloqueioHorarioService.atualizar(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bloqueio_horario"] });
    },
  });
}
