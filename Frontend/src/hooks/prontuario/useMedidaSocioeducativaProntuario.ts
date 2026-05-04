import { useMutation } from "@tanstack/react-query";
import {
  medidaSocioeducativaService,
  type AcompanhamentoLAPSCPayload,
  type AcompanhamentoLAPSCResponse,
  type MedidaSocioeducativaMembroPayload,
  type MedidaSocioeducativaMembroResponse,
  type MedidaSocioeducativaPayload,
  type MedidaSocioeducativaResponse,
} from "@/services/prontuario/medidaSocioeducativaService";

type SalvarMedidaMembroParams = {
  id?: string;
  payload: MedidaSocioeducativaMembroPayload;
};

type SalvarAcompanhamentoLAPSCParams = {
  id?: string;
  payload: AcompanhamentoLAPSCPayload;
};

type SalvarMedidaSocioeducativaParams = {
  id?: string;
  payload: MedidaSocioeducativaPayload;
};

function unwrapEnvelope<T>(data: T | { result?: T } | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: T }).result ?? null;
  }
  return data as T;
}

export function useMedidaSocioeducativaMembroProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarMedidaMembroParams) => {
      const res = id
        ? await medidaSocioeducativaService.atualizarMedidaMembro(id, payload)
        : await medidaSocioeducativaService.criarMedidaMembro(payload);
      return unwrapEnvelope<MedidaSocioeducativaMembroResponse>(res.data);
    },
  });
}

export function useAcompanhamentoLAPSCProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarAcompanhamentoLAPSCParams) => {
      const res = id
        ? await medidaSocioeducativaService.atualizarAcompanhamentoLAPSC(id, payload)
        : await medidaSocioeducativaService.criarAcompanhamentoLAPSC(payload);
      return unwrapEnvelope<AcompanhamentoLAPSCResponse>(res.data);
    },
  });
}

export function useMedidaSocioeducativaProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarMedidaSocioeducativaParams) => {
      const res = id
        ? await medidaSocioeducativaService.atualizarMedidaSocioeducativa(id, payload)
        : await medidaSocioeducativaService.criarMedidaSocioeducativa(payload);
      return unwrapEnvelope<MedidaSocioeducativaResponse>(res.data);
    },
  });
}
