import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { filaEsperaService } from "@/services/sistema/filaEsperaService";
import type { AgendamentoResponse, FilaEsperaPayload, FilaEsperaResponse, UrgenciaAtendimento } from "@/types/api";

const queryKeys = {
  lista: (params?: { limit?: number; offset?: number; cpf?: string; nome?: string }) => ["fila-espera", params ?? {}] as const,
  listaBase: ["fila-espera"] as const,
  item: (id: string) => ["fila-espera", id] as const,
};

type FilaEsperaListParams = { limit?: number; offset?: number; cpf?: string; nome?: string };

export function useFilaEspera(params?: FilaEsperaListParams) {
  return useQuery({
    queryKey: queryKeys.lista(params),
    queryFn: async () => {
      const { data } = await filaEsperaService.listar(params);

      const count = (data as unknown as { count?: number }).count;
      const paginatedPayload = (data as unknown as { results?: unknown }).results;
      if (paginatedPayload && typeof paginatedPayload === "object" && "success" in paginatedPayload) {
        const payload = paginatedPayload as { success?: boolean; result?: unknown };
        if (!payload.success) {
          const msg = typeof payload.result === "string" ? payload.result : "";
          if (msg) {
            console.warn(msg);
          }
          return { items: [] as FilaEsperaResponse[], count: typeof count === "number" ? count : 0 };
        }
        const items = Array.isArray(payload.result) ? (payload.result as FilaEsperaResponse[]) : [];
        return { items, count: typeof count === "number" ? count : items.length };
      }

      const payload = data as unknown as { success?: boolean; result?: unknown };
      if (!payload.success) {
        const msg = typeof payload.result === "string" ? payload.result : "";
        if (msg) {
          console.warn(msg);
        }
        return { items: [] as FilaEsperaResponse[], count: 0 };
      }

      const items = Array.isArray(payload.result) ? (payload.result as FilaEsperaResponse[]) : [];
      return { items, count: items.length };
    },
  });
}

export function useCriarFilaEspera() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: FilaEsperaPayload) => {
      const { data } = await filaEsperaService.criar(payload);
      if (!data.success) {
        throw new Error((data as unknown as { result?: string }).result || "Falha ao criar fila de espera");
      }
      return data.result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.listaBase });
    },
  });
}

type AtualizarUrgenciaParams = { id: string; urgencia: UrgenciaAtendimento };

export function useAtualizarUrgenciaFila() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, urgencia }: AtualizarUrgenciaParams) => {
      const { data } = await filaEsperaService.atualizarUrgencia(id, urgencia);
      if (!data.success) {
        throw new Error((data as unknown as { result?: string }).result || "Falha ao atualizar urgencia");
      }
      return data.result as FilaEsperaResponse;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.listaBase });
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: queryKeys.item(variables.id) });
      }
    },
  });
}

export function useRemoverFilaEspera() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => filaEsperaService.deletar(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: queryKeys.listaBase });
      if (id) {
        qc.invalidateQueries({ queryKey: queryKeys.item(id) });
      }
    },
  });
}

export function useChamarProximoFila() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await filaEsperaService.chamarProximo();
      if (!data.success) {
        throw new Error((data as unknown as { result?: string }).result || "Nenhuma pessoa na fila para chamar");
      }
      return data.result as AgendamentoResponse;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.listaBase });
      qc.invalidateQueries({ queryKey: ["agendamentos"] });
    },
  });
}
