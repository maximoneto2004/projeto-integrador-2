import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  unidadeProntuarioService,
  type UnidadeProntuario,
  type UnidadeProntuarioListParams,
  type UnidadeProntuarioPayload,
} from "@/services/prontuario/unidadeProntuarioService";

type ListEnvelope<T> = {
  count?: number;
  result?: T;
  results?: T;
  data?: T;
};

type UnidadeProntuarioAdminItem = {
  id: string;
  unidade: string;
  ativo: boolean;
};

type PaginatedListResult<T> = {
  items: T[];
  total: number;
};

const queryKeys = {
  lista: ["unidades_prontuario_admin"] as const,
};

const extractItems = <T>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const data = payload as ListEnvelope<T[]>;
  if (Array.isArray(data.result)) return data.result;
  if (Array.isArray(data.results)) return data.results;
  if (Array.isArray(data.data)) return data.data;

  if (data.results && typeof data.results === "object") {
    const nested = data.results as ListEnvelope<T[]>;
    if (Array.isArray(nested.result)) return nested.result;
  }

  return [];
};

const extractTotal = (payload: unknown, fallbackLength: number): number => {
  if (!payload || typeof payload !== "object") return fallbackLength;
  const data = payload as { count?: unknown };
  if (typeof data.count === "number") return data.count;
  return fallbackLength;
};

const parseUnidades = (payload: unknown): PaginatedListResult<UnidadeProntuarioAdminItem> => {
  const list = extractItems<UnidadeProntuario | string>(payload)
    .filter((item): item is UnidadeProntuario => typeof item === "object" && item !== null)
    .map((item) => ({
      id: String(item.id || ""),
      unidade: String(item.unidade || item.nome || ""),
      ativo: item.is_active ?? true,
    }))
    .filter((item) => item.id);

  return {
    items: list,
    total: extractTotal(payload, list.length),
  };
};

export function useUnidadesProntuarioAdmin(search: string, pageSize = 10) {
  const [page, setPage] = useState(1);
  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);
  const params = useMemo<UnidadeProntuarioListParams>(
    () => ({
      search: search.trim() || undefined,
      limit: pageSize,
      offset,
    }),
    [offset, pageSize, search],
  );

  const query = useQuery({
    queryKey: [...queryKeys.lista, params],
    queryFn: async () => {
      const { data } = await unidadeProntuarioService.listar(params);
      return parseUnidades(data);
    },
  });

  return {
    items: query.data?.items ?? [],
    total: query.data?.total ?? 0,
    page,
    setPage,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}

export function useCreateUnidadeProntuario() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (payload: UnidadeProntuarioPayload) => unidadeProntuarioService.criar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}

export function useUpdateUnidadeProntuario() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<UnidadeProntuarioPayload> }) => unidadeProntuarioService.atualizar(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}

export function useAtivarUnidadeProntuario() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unidadeProntuarioService.ativar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}

export function useDesativarUnidadeProntuario() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => unidadeProntuarioService.desativar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}
