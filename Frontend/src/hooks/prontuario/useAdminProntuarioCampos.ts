import { useCallback, useEffect, useMemo, useState } from "react";
import { beneficioService, type BeneficioSocial } from "@/services/prontuario/beneficioService";
import { encaminhamentoService } from "@/services/prontuario/encaminhamentoService";
import { unidadeProntuarioService, type UnidadeProntuario } from "@/services/prontuario/unidadeProntuarioService";
import type { CodigoArea } from "@/types/encaminhamento";

type ListEnvelope<T> = {
  count?: number;
  result?: T;
  results?: T;
  data?: T;
};

export type UnidadeAdminItem = {
  id: string;
  unidade: string;
  ativo: boolean;
};

export type BeneficioAdminItem = {
  id: string;
  nome: string;
  ativo: boolean;
};

export type CodigoAreaAdminItem = {
  id: string;
  nome: string;
  codigo: number;
  ativo: boolean;
};

type PaginatedListResult<T> = {
  items: T[];
  total: number;
};

const extractItems = <T,>(payload: unknown): T[] => {
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

const parseUnidades = (payload: unknown): PaginatedListResult<UnidadeAdminItem> => {
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

const parseBeneficios = (payload: unknown): PaginatedListResult<BeneficioAdminItem> => {
  const list = extractItems<BeneficioSocial | string>(payload)
    .filter((item): item is BeneficioSocial => typeof item === "object" && item !== null)
    .map((item) => ({
      id: String(item.id || ""),
      nome: String(item.nome || ""),
      ativo: item.is_active ?? true,
    }))
    .filter((item) => item.id);

  return {
    items: list,
    total: extractTotal(payload, list.length),
  };
};

const parseCodigoAreas = (payload: unknown): PaginatedListResult<CodigoAreaAdminItem> => {
  const list = extractItems<CodigoArea | string>(payload)
    .filter((item): item is CodigoArea => typeof item === "object" && item !== null)
    .map((item) => ({
      id: String(item.id || ""),
      nome: String(item.nome || ""),
      codigo: Number(item.codigo || 0),
      ativo: item.is_active ?? true,
    }))
    .filter((item) => item.id);

  return {
    items: list,
    total: extractTotal(payload, list.length),
  };
};

export function useUnidadesProntuarioAdmin(search: string, pageSize = 10) {
  const [items, setItems] = useState<UnidadeAdminItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await unidadeProntuarioService.listar({ search: search.trim() || undefined, limit: pageSize, offset });
      const parsed = parseUnidades(data);
      setItems(parsed.items);
      setTotal(parsed.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [offset, pageSize, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { items, total, page, setPage, loading, error, refresh: fetchData };
}

export function useBeneficiosSociaisAdmin(search: string, pageSize = 10) {
  const [items, setItems] = useState<BeneficioAdminItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await beneficioService.listarBeneficiosSociais({ search: search.trim() || undefined, limit: pageSize, offset });
      const parsed = parseBeneficios(data);
      setItems(parsed.items);
      setTotal(parsed.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [offset, pageSize, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { items, total, page, setPage, loading, error, refresh: fetchData };
}

export function useCodigoAreasAdmin(search: string, pageSize = 10) {
  const [items, setItems] = useState<CodigoAreaAdminItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const offset = useMemo(() => (page - 1) * pageSize, [page, pageSize]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await encaminhamentoService.listarCodigoAreas({
        search: search.trim() || undefined,
        limit: pageSize,
        offset,
      });
      const parsed = parseCodigoAreas(data);
      setItems(parsed.items);
      setTotal(parsed.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [offset, pageSize, search]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  return { items, total, page, setPage, loading, error, refresh: fetchData };
}
