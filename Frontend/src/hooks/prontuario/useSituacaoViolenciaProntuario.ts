import { useMutation } from "@tanstack/react-query";
import {
  situacaoViolenciaService,
  type AcompanhamentoCreasPayload,
  type AcompanhamentoCreasResponse,
  type SituacaoViolenciaPayload,
  type SituacaoViolenciaResponse,
} from "@/services/prontuario/situacaoViolenciaService";

type SalvarSituacaoViolenciaParams = {
  id?: string;
  payload: SituacaoViolenciaPayload;
};

type SalvarAcompanhamentoCreasParams = {
  payload: AcompanhamentoCreasPayload;
};

function unwrapEnvelope<T>(data: T | { result?: T } | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: T }).result ?? null;
  }
  return data as T;
}

export function useSituacaoViolenciaProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarSituacaoViolenciaParams) => {
      const res = id
        ? await situacaoViolenciaService.atualizar(id, payload)
        : await situacaoViolenciaService.criar(payload);
      return unwrapEnvelope<SituacaoViolenciaResponse>(res.data);
    },
  });
}

export function useAcompanhamentoCreasProntuario() {
  return useMutation({
    mutationFn: async ({ payload }: SalvarAcompanhamentoCreasParams) => {
      const res = await situacaoViolenciaService.criarAcompanhamentoCreas(payload);
      return unwrapEnvelope<AcompanhamentoCreasResponse>(res.data);
    },
  });
}

export function useRemoverAcompanhamentoCreasProntuario() {
  return useMutation({
    mutationFn: async (id: string) => {
      await situacaoViolenciaService.removerAcompanhamentoCreas(id);
      return true;
    },
  });
}
