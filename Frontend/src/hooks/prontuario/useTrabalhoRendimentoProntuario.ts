import { useMutation } from "@tanstack/react-query";
import {
  trabalhoRendimentoService,
  type TrabalhoRendimentoMembroPayload,
  type TrabalhoRendimentoMembroResponse,
  type TrabalhoRendimentoPayload,
  type TrabalhoRendimentoResponse,
  type TransferenciaRendaPayload,
  type TransferenciaRendaResponse,
} from "@/services/prontuario/trabalhoRendimentoService";

type SalvarTrabalhoMembroParams = {
  id?: string;
  payload: TrabalhoRendimentoMembroPayload;
};

type SalvarTransferenciaRendaParams = {
  id?: string;
  payload: TransferenciaRendaPayload;
};

type SalvarTrabalhoRendimentoParams = {
  id?: string;
  payload: TrabalhoRendimentoPayload;
};

function unwrapEnvelope<T>(data: T | { result?: T } | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: T }).result ?? null;
  }
  return data as T;
}

export function useTrabalhoRendimentoMembroProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarTrabalhoMembroParams) => {
      const res = id
        ? await trabalhoRendimentoService.atualizarMembro(id, payload)
        : await trabalhoRendimentoService.criarMembro(payload);
      return unwrapEnvelope<TrabalhoRendimentoMembroResponse>(res.data);
    },
  });
}

export function useTransferenciaRendaProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarTransferenciaRendaParams) => {
      const res = id
        ? await trabalhoRendimentoService.atualizarTransferencia(id, payload)
        : await trabalhoRendimentoService.criarTransferencia(payload);
      return unwrapEnvelope<TransferenciaRendaResponse>(res.data);
    },
  });
}

export function useTrabalhoRendimentoProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarTrabalhoRendimentoParams) => {
      const res = id
        ? await trabalhoRendimentoService.atualizar(id, payload)
        : await trabalhoRendimentoService.criar(payload);
      return unwrapEnvelope<TrabalhoRendimentoResponse>(res.data);
    },
  });
}

