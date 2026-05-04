import { useMutation } from "@tanstack/react-query";
import {
  evolucaoAcompanhamentoService,
  type AnotacaoPlanejamentoPayload,
  type AnotacaoPlanejamentoResponse,
  type NovoIngressoPayload,
  type NovoIngressoResponse,
  type RegistroDesligamentoPayload,
  type RegistroDesligamentoResponse,
  type EvolucaoAcompanhamentoPayload,
  type EvolucaoAcompanhamentoResponse,
} from "@/services/prontuario/evolucaoAcompanhamentoService";

type SalvarAnotacaoPlanejamentoParams = {
  id?: string;
  payload: AnotacaoPlanejamentoPayload;
};

type SalvarNovoIngressoParams = {
  id?: string;
  payload: NovoIngressoPayload;
};

type SalvarRegistroDesligamentoParams = {
  id?: string;
  payload: RegistroDesligamentoPayload;
};

type SalvarEvolucaoAcompanhamentoParams = {
  id?: string;
  payload: EvolucaoAcompanhamentoPayload;
};

function unwrapEnvelope<T>(data: T | { result?: T } | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: T }).result ?? null;
  }
  return data as T;
}

export function useAnotacaoPlanejamentoProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarAnotacaoPlanejamentoParams) => {
      const res = id
        ? await evolucaoAcompanhamentoService.atualizarAnotacaoPlanejamento(id, payload)
        : await evolucaoAcompanhamentoService.criarAnotacaoPlanejamento(payload);
      return unwrapEnvelope<AnotacaoPlanejamentoResponse>(res.data);
    },
  });
}

export function useNovoIngressoProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarNovoIngressoParams) => {
      const res = id
        ? await evolucaoAcompanhamentoService.atualizarNovoIngresso(id, payload)
        : await evolucaoAcompanhamentoService.criarNovoIngresso(payload);
      return unwrapEnvelope<NovoIngressoResponse>(res.data);
    },
  });
}

export function useRegistroDesligamentoProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarRegistroDesligamentoParams) => {
      const res = id
        ? await evolucaoAcompanhamentoService.atualizarRegistroDesligamento(id, payload)
        : await evolucaoAcompanhamentoService.criarRegistroDesligamento(payload);
      return unwrapEnvelope<RegistroDesligamentoResponse>(res.data);
    },
  });
}

export function useEvolucaoAcompanhamentoProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarEvolucaoAcompanhamentoParams) => {
      const res = id
        ? await evolucaoAcompanhamentoService.atualizarEvolucaoAcompanhamento(id, payload)
        : await evolucaoAcompanhamentoService.criarEvolucaoAcompanhamento(payload);
      return unwrapEnvelope<EvolucaoAcompanhamentoResponse>(res.data);
    },
  });
}
