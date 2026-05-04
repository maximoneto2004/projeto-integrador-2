import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { encaminhamentoService } from "@/services/prontuario/encaminhamentoService";
import type {
  CodigoArea,
  CodigoAreaParams,
  CodigoAreaPayload,
  Encaminhamento,
  EncaminhamentoParams,
  EncaminhamentoPayload,
} from "@/types/encaminhamento";

const queryKeys = {
  codigoAreas: (params?: CodigoAreaParams) => ["codigo-areas", params ?? {}] as const,
  codigoArea: (id: string) => ["codigo-area", id] as const,
  encaminhamentos: (params?: EncaminhamentoParams) => ["encaminhamentos", params ?? {}] as const,
  encaminhamento: (id: string) => ["encaminhamento", id] as const,
};

function extractList<T>(payload: { result?: T[]; results?: T[] } | undefined) {
  if (!payload) return [] as T[];
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.result)) return payload.result;
  return [] as T[];
}

export function useCodigoAreas(params?: CodigoAreaParams, enabled = true) {
  return useQuery<CodigoArea[]>({
    queryKey: queryKeys.codigoAreas(params),
    queryFn: async () => {
      const { data } = await encaminhamentoService.listarCodigoAreas(params);
      if (data?.success === false) {
        throw new Error((data as { mensagem?: string }).mensagem || "Falha ao carregar códigos de área");
      }
      return extractList<CodigoArea>(data);
    },
    enabled,
  });
}

export function useCodigoArea(id?: string, enabled = true) {
  return useQuery<CodigoArea>({
    queryKey: id ? queryKeys.codigoArea(id) : ["codigo-area", "sem-id"],
    queryFn: async () => {
      if (!id) throw new Error("Id de código de área é obrigatório");
      const { data } = await encaminhamentoService.obterCodigoArea(id);
      if (data?.success === false || !data?.result) {
        throw new Error((data as { detail?: string; mensagem?: string }).detail || "Código de área não encontrado");
      }
      return data.result;
    },
    enabled: Boolean(id) && enabled,
  });
}

export function useCriarCodigoArea() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CodigoAreaPayload) => {
      const { data } = await encaminhamentoService.criarCodigoArea(payload);
      if (data?.success === false || !data?.result) {
        throw new Error((data as { detail?: string; mensagem?: string }).detail || "Falha ao criar código de área");
      }
      return data.result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["codigo-areas"] });
    },
  });
}

export function useAtualizarCodigoArea() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<CodigoAreaPayload> }) => {
      const { data } = await encaminhamentoService.atualizarCodigoArea(id, payload);
      if (data?.success === false || !data?.result) {
        throw new Error((data as { detail?: string; mensagem?: string }).detail || "Falha ao atualizar código de área");
      }
      return data.result;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["codigo-areas"] });
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: queryKeys.codigoArea(variables.id) });
      }
    },
  });
}

export function useRemoverCodigoArea() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await encaminhamentoService.removerCodigoArea(id);
      if (data?.success === false) {
        throw new Error((data as { detail?: string; mensagem?: string }).detail || "Falha ao remover código de área");
      }
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["codigo-areas"] });
      qc.invalidateQueries({ queryKey: queryKeys.codigoArea(id) });
    },
  });
}

export function useEncaminhamentos(params?: EncaminhamentoParams, enabled = true) {
  return useQuery<Encaminhamento[]>({
    queryKey: queryKeys.encaminhamentos(params),
    queryFn: async () => {
      const { data } = await encaminhamentoService.listarEncaminhamentos(params);
      if (data?.success === false) {
        throw new Error((data as { mensagem?: string }).mensagem || "Falha ao carregar encaminhamentos");
      }
      return extractList<Encaminhamento>(data);
    },
    enabled,
  });
}

export function useEncaminhamento(id?: string, enabled = true) {
  return useQuery<Encaminhamento>({
    queryKey: id ? queryKeys.encaminhamento(id) : ["encaminhamento", "sem-id"],
    queryFn: async () => {
      if (!id) throw new Error("Id de encaminhamento é obrigatório");
      const { data } = await encaminhamentoService.obterEncaminhamento(id);
      if (data?.success === false || !data?.result) {
        throw new Error((data as { detail?: string; mensagem?: string }).detail || "Encaminhamento não encontrado");
      }
      return data.result;
    },
    enabled: Boolean(id) && enabled,
  });
}

export function useCriarEncaminhamento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: EncaminhamentoPayload) => {
      const { data } = await encaminhamentoService.criarEncaminhamento(payload);
      if (data?.success === false || !data?.result) {
        throw new Error((data as { detail?: string; mensagem?: string }).detail || "Falha ao criar encaminhamento");
      }
      return data.result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["encaminhamentos"] });
    },
  });
}

export function useAtualizarEncaminhamento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<EncaminhamentoPayload> }) => {
      const { data } = await encaminhamentoService.atualizarEncaminhamento(id, payload);
      if (data?.success === false || !data?.result) {
        throw new Error((data as { detail?: string; mensagem?: string }).detail || "Falha ao atualizar encaminhamento");
      }
      return data.result;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ["encaminhamentos"] });
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: queryKeys.encaminhamento(variables.id) });
      }
    },
  });
}

export function useRemoverEncaminhamento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await encaminhamentoService.removerEncaminhamento(id);
      if (data?.success === false) {
        throw new Error((data as { detail?: string; mensagem?: string }).detail || "Falha ao remover encaminhamento");
      }
      return id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["encaminhamentos"] });
      qc.invalidateQueries({ queryKey: queryKeys.encaminhamento(id) });
    },
  });
}
