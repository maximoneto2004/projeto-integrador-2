import { useMutation } from "@tanstack/react-query";
import {
  condicaoHabitacionalService,
  type CondicaoHabitacionalPayload,
  type CondicaoHabitacionalResponse,
} from "@/services/prontuario/condicaoHabitacionalService";

type SalvarParams = {
  id?: string;
  payload: CondicaoHabitacionalPayload;
};

function unwrapEnvelope(
  data: CondicaoHabitacionalResponse | { result?: CondicaoHabitacionalResponse } | null | undefined
) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: CondicaoHabitacionalResponse }).result ?? null;
  }
  return data as CondicaoHabitacionalResponse;
}

export function useCondicaoHabitacionalProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarParams) => {
      const res = id
        ? await condicaoHabitacionalService.atualizar(id, payload)
        : await condicaoHabitacionalService.criar(payload);
      return unwrapEnvelope(res.data);
    },
  });
}
