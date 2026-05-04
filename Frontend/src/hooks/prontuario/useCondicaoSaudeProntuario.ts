import { useMutation } from "@tanstack/react-query";
import {
  condicaoSaudeService,
  type CondicoesDeSaudePayload,
  type CondicoesDeSaudeResponse,
  type DescumprimentoCondicionalidadesBolsaPayload,
  type DescumprimentoCondicionalidadesBolsaResponse,
  type SaudeCuidadosMembroPayload,
  type SaudeCuidadosMembroResponse,
} from "@/services/prontuario/condicaoSaudeService";

type SalvarSaudeMembroParams = {
  id?: string;
  payload: SaudeCuidadosMembroPayload;
};

type SalvarCondicoesDeSaudeParams = {
  id?: string;
  payload: CondicoesDeSaudePayload;
};

type SalvarDescumprimentoCondicionalidadesBolsaParams = {
  id?: string;
  payload: DescumprimentoCondicionalidadesBolsaPayload;
};

function unwrapEnvelope<T>(data: T | { result?: T } | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: T }).result ?? null;
  }
  return data as T;
}

export function useSaudeCuidadosMembroProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarSaudeMembroParams) => {
      const res = id
        ? await condicaoSaudeService.atualizarMembro(id, payload)
        : await condicaoSaudeService.criarMembro(payload);
      return unwrapEnvelope<SaudeCuidadosMembroResponse>(res.data);
    },
  });
}

export function useCondicoesDeSaudeProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarCondicoesDeSaudeParams) => {
      const res = id
        ? await condicaoSaudeService.atualizar(id, payload)
        : await condicaoSaudeService.criar(payload);
      return unwrapEnvelope<CondicoesDeSaudeResponse>(res.data);
    },
  });
}

export function useDescumprimentoCondicionalidadesBolsaProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarDescumprimentoCondicionalidadesBolsaParams) => {
      const res = id
        ? await condicaoSaudeService.atualizarDescumprimentoCondicionalidadesBolsa(id, payload)
        : await condicaoSaudeService.criarDescumprimentoCondicionalidadesBolsa(payload);
      return unwrapEnvelope<DescumprimentoCondicionalidadesBolsaResponse>(res.data);
    },
  });
}

export function useRemoverDescumprimentoCondicionalidadesBolsaProntuario() {
  return useMutation({
    mutationFn: async (id: string) => {
      await condicaoSaudeService.removerDescumprimentoCondicionalidadesBolsa(id);
      return true;
    },
  });
}
