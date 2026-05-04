import { useMutation } from "@tanstack/react-query";
import {
  acolhimentoInstitucionalService,
  type AcolhimentoFamiliarPayload,
  type AcolhimentoFamiliarResponse,
  type AcolhimentoInstitucionalPayload,
  type AcolhimentoInstitucionalResponse,
} from "@/services/prontuario/acolhimentoInstitucionalService";

type SalvarAcolhimentoFamiliarParams = {
  id?: string;
  payload: AcolhimentoFamiliarPayload;
};

type SalvarAcolhimentoInstitucionalParams = {
  id?: string;
  payload: AcolhimentoInstitucionalPayload;
};

function unwrapEnvelope<T>(data: T | { result?: T } | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: T }).result ?? null;
  }
  return data as T;
}

export function useAcolhimentoFamiliarProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarAcolhimentoFamiliarParams) => {
      const res = id
        ? await acolhimentoInstitucionalService.atualizarAcolhimentoFamiliar(id, payload)
        : await acolhimentoInstitucionalService.criarAcolhimentoFamiliar(payload);
      return unwrapEnvelope<AcolhimentoFamiliarResponse>(res.data);
    },
  });
}

export function useRemoverAcolhimentoFamiliarProntuario() {
  return useMutation({
    mutationFn: async (id: string) => {
      await acolhimentoInstitucionalService.removerAcolhimentoFamiliar(id);
      return true;
    },
  });
}

export function useAcolhimentoInstitucionalProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarAcolhimentoInstitucionalParams) => {
      const res = id
        ? await acolhimentoInstitucionalService.atualizarAcolhimentoInstitucional(id, payload)
        : await acolhimentoInstitucionalService.criarAcolhimentoInstitucional(payload);
      return unwrapEnvelope<AcolhimentoInstitucionalResponse>(res.data);
    },
  });
}
