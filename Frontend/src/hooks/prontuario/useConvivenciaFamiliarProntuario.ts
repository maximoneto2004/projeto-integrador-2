import { useMutation } from "@tanstack/react-query";
import {
  convivenciaFamiliarService,
  type ConvivenciaFamiliarPayload,
  type ConvivenciaFamiliarResponse,
} from "@/services/prontuario/convivenciaFamiliarService";

type SalvarConvivenciaFamiliarParams = {
  id?: string;
  payload: ConvivenciaFamiliarPayload;
};

function unwrapEnvelope<T>(data: T | { result?: T } | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: T }).result ?? null;
  }
  return data as T;
}

export function useConvivenciaFamiliarProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarConvivenciaFamiliarParams) => {
      const res = id
        ? await convivenciaFamiliarService.atualizar(id, payload)
        : await convivenciaFamiliarService.criar(payload);
      return unwrapEnvelope<ConvivenciaFamiliarResponse>(res.data);
    },
  });
}

