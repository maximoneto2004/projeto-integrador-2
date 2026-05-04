import { useMutation } from "@tanstack/react-query";
import {
  prontuarioService,
  type ProntuarioCreatePayload,
  type ProntuarioListParams,
} from "@/services/prontuario/prontuarioService";

type ApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  mensagem?: string;
  detail?: string;
};

function unwrapEnvelope<T>(data: T | ApiEnvelope<T> | null | undefined) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as ApiEnvelope<T>).result ?? null;
  }
  return data as T;
}

type BuscarProntuarioParams = {
  termo: string;
  limit: number;
  offset: number;
};

function normalizeDigits(value: string) {
  return value.replace(/\D/g, "");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function buildBuscarParams(termo: string): ProntuarioListParams {
  const clean = termo.trim();

  if (isUuid(clean)) {
    return { unidade_inicial: clean };
  }

  return { search: clean };
}

export function useProntuario() {
  return useMutation({
    mutationFn: async (payload: ProntuarioCreatePayload) => {
      const { data } = await prontuarioService.criar(payload);
      if (data && typeof data === "object" && "success" in data && (data as ApiEnvelope<unknown>).success === false) {
        const message =
          (data as ApiEnvelope<string>).result ||
          (data as ApiEnvelope<string>).mensagem ||
          (data as ApiEnvelope<string>).detail ||
          "Falha ao criar prontuário.";
        throw new Error(message);
      }
      return unwrapEnvelope(data);
    },
  });
}

export function useBuscarProntuario() {
  return useMutation({
    mutationFn: async ({ termo, limit, offset }: BuscarProntuarioParams) => {
      const filtros = buildBuscarParams(termo);
      const { data } = await prontuarioService.listar({ ...filtros, limit, offset });
      return data;
    },
  });
}
