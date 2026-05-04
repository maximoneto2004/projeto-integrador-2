import { useMutation } from "@tanstack/react-query";
import {
  condicaoEducacionalService,
  type CondicaoEducacionalPayload,
  type CondicaoEducacionalResponse,
  type CondicaoEducacionalMembroPayload,
  type CondicaoEducacionalMembroResponse,
  type DescumprimentoEducacionalPayload,
  type DescumprimentoEducacionalResponse,
} from "@/services/prontuario/condicaoEducacionalService";

type SalvarCondicaoEducacionalParams = {
  id?: string;
  payload: CondicaoEducacionalPayload;
};

type SalvarCondicaoEducacionalMembroParams = {
  id?: string;
  payload: CondicaoEducacionalMembroPayload;
};

type SalvarDescumprimentoEducacionalParams = {
  id?: string;
  payload: DescumprimentoEducacionalPayload;
};

function unwrapEnvelope<T>(data: T | { result?: T } | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: T }).result ?? null;
  }
  return data as T;
}

export function useCondicaoEducacionalProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarCondicaoEducacionalParams) => {
      const res = id
        ? await condicaoEducacionalService.atualizar(id, payload)
        : await condicaoEducacionalService.criar(payload);
      return unwrapEnvelope<CondicaoEducacionalResponse>(res.data);
    },
  });
}

export function useCondicaoEducacionalMembroProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarCondicaoEducacionalMembroParams) => {
      const res = id
        ? await condicaoEducacionalService.atualizarMembro(id, payload)
        : await condicaoEducacionalService.criarMembro(payload);
      return unwrapEnvelope<CondicaoEducacionalMembroResponse>(res.data);
    },
  });
}

export function useDescumprimentoEducacionalProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarDescumprimentoEducacionalParams) => {
      const res = id
        ? await condicaoEducacionalService.atualizarDescumprimento(id, payload)
        : await condicaoEducacionalService.criarDescumprimento(payload);
      return unwrapEnvelope<DescumprimentoEducacionalResponse>(res.data);
    },
  });
}
