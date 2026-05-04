import { useMutation } from "@tanstack/react-query";
import {
  avaliacaoAcompanhamentoFamiliarService,
  type AvaliacaoAcompanhamentoFamiliarPayload,
  type AvaliacaoAcompanhamentoFamiliarResponse,
} from "@/services/prontuario/avaliacaoAcompanhamentoFamiliarService";

type SalvarAvaliacaoAcompanhamentoFamiliarParams = {
  id?: string;
  payload: AvaliacaoAcompanhamentoFamiliarPayload;
};

function unwrapEnvelope<T>(data: T | { result?: T } | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: T }).result ?? null;
  }
  return data as T;
}

export function useAvaliacaoAcompanhamentoFamiliarProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarAvaliacaoAcompanhamentoFamiliarParams) => {
      const res = id
        ? await avaliacaoAcompanhamentoFamiliarService.atualizar(id, payload)
        : await avaliacaoAcompanhamentoFamiliarService.criar(payload);
      return unwrapEnvelope<AvaliacaoAcompanhamentoFamiliarResponse>(res.data);
    },
  });
}
