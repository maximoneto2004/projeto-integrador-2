import { useCallback, useState } from "react";

import { guicheService, type GuicheAdminPayload, type GuicheAdminResponse } from "@/services/sistema/guicheService";

export type GuicheItem = {
  id: string;
  nome: string;
  ocupado?: boolean;
};

type GuichePagination = {
  limit?: string;
  offset?: string;
};

const normalizarGuiche = (item: unknown): GuicheItem | null => {
  if (!item || typeof item !== "object") return null;
  const candidate = item as { id?: unknown; nome?: unknown; ocupado?: unknown };
  if (!candidate.id) return null;
  return {
    id: String(candidate.id),
    nome: typeof candidate.nome === "string" ? candidate.nome : "",
    ocupado: typeof candidate.ocupado === "boolean" ? candidate.ocupado : undefined,
  };
};

const extrairLista = (data: unknown): GuicheItem[] => {
  if (Array.isArray(data)) {
    return data.map(normalizarGuiche).filter(Boolean) as GuicheItem[];
  }
  if (!data || typeof data !== "object") return [];
  const envelope = data as { success?: boolean; data?: unknown; result?: unknown };
  if (envelope.success === false) return [];
  const payload = envelope.data ?? envelope.result;
  if (Array.isArray(payload)) {
    return payload.map(normalizarGuiche).filter(Boolean) as GuicheItem[];
  }
  return [];
};

const extrairGuicheAdmin = (data: unknown): GuicheAdminResponse | null => {
  if (!data || typeof data !== "object") return null;
  const envelope = data as { data?: unknown; result?: unknown };
  const payload = envelope.data ?? envelope.result ?? data;
  if (!payload || typeof payload !== "object") return null;
  const candidate = payload as { id?: unknown; nome?: unknown; unidade?: unknown; is_active?: unknown };
  if (!candidate.id) return null;
  return {
    id: String(candidate.id),
    nome: typeof candidate.nome === "string" ? candidate.nome : "",
    unidade: typeof candidate.unidade === "string" ? candidate.unidade : String(candidate.unidade ?? ""),
    is_active: typeof candidate.is_active === "boolean" ? candidate.is_active : undefined,
  };
};

export function useGuiches(nome?: string) {
  const [guiches, setGuiches] = useState<GuicheItem[]>([]);
  const [unidadeId, setUnidadeId] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [previousPage, setPreviousPage] = useState<string | null>(null);
  const [lastPagination, setLastPagination] = useState<GuichePagination>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const fetchGuiches = useCallback(
    async (id: string, pagination?: GuichePagination) => {
      setLoading(true);
      setError(null);
      setUnidadeId(id);
      setLastPagination(pagination ?? {});
      try {
        const response = await guicheService.listarAdmin({ unidade: id, nome, ...pagination });
        const lista = extrairLista(response.payload);
        setGuiches(lista);
        setTotalCount(response.count > 0 ? response.count : lista.length);
        setNextPage(response.next);
        setPreviousPage(response.previous);
      } catch (err) {
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) {
          setGuiches([]);
          setTotalCount(0);
          setNextPage(null);
          setPreviousPage(null);
        } else {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    },
    [nome]
  );

  const createGuiche = useCallback(async (payload: GuicheAdminPayload) => {
    const { data } = await guicheService.criar(payload);
    const created = extrairGuicheAdmin(data);
    if (created && unidadeId) {
      await fetchGuiches(unidadeId, lastPagination);
    }
    return created;
  }, [fetchGuiches, lastPagination, unidadeId]);

  const updateGuiche = useCallback(async (id: string, payload: Partial<GuicheAdminPayload>) => {
    const { data } = await guicheService.atualizar(id, payload);
    const updated = extrairGuicheAdmin(data);
    if (updated && unidadeId) {
      await fetchGuiches(unidadeId, lastPagination);
    }
    return updated;
  }, [fetchGuiches, lastPagination, unidadeId]);

  const deleteGuiche = useCallback(async (id: string) => {
    await guicheService.remover(id);
    if (unidadeId) {
      await fetchGuiches(unidadeId, lastPagination);
    }
  }, [fetchGuiches, lastPagination, unidadeId]);

  return {
    guiches,
    unidadeId,
    totalCount,
    nextPage,
    previousPage,
    loading,
    error,
    fetchGuiches,
    createGuiche,
    updateGuiche,
    deleteGuiche,
  };
}
