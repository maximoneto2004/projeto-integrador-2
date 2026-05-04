import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { agendamentoService, type AgendamentoListParams } from "@/services/sistema/agendamentoService";
import type {
  AgendaVaga,
  AgendaVagaListItem,
  AgendamentoRequest,
  AgendamentoResponse,
  PaginatedResponse,
} from "@/types/api";

type VagasParams = { data?: string; tipo_servico?: string; unidade?: string };
type UseAgendamentosOptions = {
  refetchInterval?: number | false;
  refetchIntervalInBackground?: boolean;
  refetchOnWindowFocus?: boolean;
};
const agendamentosBaseKey = ["agendamentos"] as const;

const queryKeys = {
  vagas: (params: VagasParams) => ["vagas", params] as const,
  agendamentos: (params?: AgendamentoListParams) => [...agendamentosBaseKey, params ?? {}] as const,
  agendamento: (id: string) => ["agendamento", id] as const,
};

export function useVagas(params: VagasParams) {
  return useQuery({
    queryKey: queryKeys.vagas(params),
    queryFn: async () => {
      const { data } = await agendamentoService.listarVagas(params);
      if (!data.success) {
        throw new Error((data as unknown as { result?: string }).result || "Falha ao carregar vagas");
      }
      return (data.result || []) as Array<AgendaVaga | AgendaVagaListItem>;
    },
  });
}

export function useAgendamentos(params?: AgendamentoListParams, options?: UseAgendamentosOptions) {
  return useQuery({
    queryKey: queryKeys.agendamentos(params),
    queryFn: async () => {
      const { data } = await agendamentoService.listar(params);
      if (!data.success) {
        throw new Error((data as unknown as { result?: string }).result || "Nenhum agendamento encontrado");
      }
      const count = (data as unknown as { count?: number }).count;
      const next = (data as unknown as { next?: string | null }).next;
      const previous = (data as unknown as { previous?: string | null }).previous;
      const payload = data.result as AgendamentoResponse[] | PaginatedResponse<AgendamentoResponse> | undefined;
      if (Array.isArray(payload)) {
        return {
          items: payload,
          count: typeof count === "number" ? count : payload.length,
          next: next ?? null,
          previous: previous ?? null,
        };
      }
      if (payload && Array.isArray(payload.results)) {
        return {
          items: payload.results,
          count: payload.count ?? payload.results.length,
          next: payload.next ?? null,
          previous: payload.previous ?? null,
        };
      }
      return { items: [], count: 0 };
    },
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: options?.refetchIntervalInBackground,
    refetchOnWindowFocus: options?.refetchOnWindowFocus,
  });
}

export function useAgendamento(id: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.agendamento(id),
    queryFn: async () => {
      const { data } = await agendamentoService.obter(id);
      if (!data.success) {
        throw new Error((data as unknown as { result?: string }).result || "Agendamento não encontrado");
      }
      return data.result;
    },
    enabled,
  });
}

export function useCriarAgendamento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: AgendamentoRequest) => {
      const { data } = await agendamentoService.criar(payload);
      if (!data.success) {
        throw new Error((data as unknown as { result?: string }).result || "Falha ao criar agendamento");
      }
      return data.result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: agendamentosBaseKey });
    },
  });
}

type AtualizarAgendamentoParams = {
  id: string;
  payload: Partial<AgendamentoRequest>;
};

export function useAtualizarAgendamento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: AtualizarAgendamentoParams) => {
      const { data } = await agendamentoService.atualizar(id, payload);
      if (!data.success) {
        throw new Error((data as unknown as { result?: string }).result || "Falha ao atualizar agendamento");
      }
      return data.result as AgendamentoResponse;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: agendamentosBaseKey });
      if (variables?.id) {
        qc.invalidateQueries({ queryKey: queryKeys.agendamento(variables.id) });
      }
    },
  });
}

export function useAtivarAusente() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agendamentoService.ativarAusente(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: agendamentosBaseKey });
      if (id) {
        qc.invalidateQueries({ queryKey: queryKeys.agendamento(id) });
      }
    },
  });
}

export function useCancelarAgendamento() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => agendamentoService.cancelarAgendamento(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: agendamentosBaseKey });
      if (id) {
        qc.invalidateQueries({ queryKey: queryKeys.agendamento(id) });
      }
    },
  });
}
