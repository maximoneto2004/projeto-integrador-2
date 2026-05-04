import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { servicosConfigService } from "@/services/sistema/servicosConfigService";
import type { ServicoDetalhado, ServicoUnidadeCras } from "@/types/api";

const queryKeys = {
  servicos: ["servicos"] as const,
  servicosUnidade: (unidadeId: string) => ["servicos-unidade", unidadeId] as const,
  servicosUnidadePaginado: ["servicos-unidade-paginado"] as const,
};

export function useServicosDisponiveis(enabled = true) {
  return useQuery<ServicoDetalhado[]>({
    queryKey: queryKeys.servicos,
    queryFn: () => servicosConfigService.listarServicos(),
    enabled,
  });
}

export function useServicosUnidade(unidadeId?: string, enabled = true) {
  return useQuery<ServicoUnidadeCras[]>({
    queryKey: unidadeId ? queryKeys.servicosUnidade(unidadeId) : ["servicos-unidade", "sem-unidade"],
    queryFn: () => servicosConfigService.listarServicosUnidade({ unidade: unidadeId }),
    enabled: Boolean(unidadeId) && enabled,
  });
}

export function useServicosUnidadePaginados(
  params?: { unidade?: string; nome?: string; limit?: string; offset?: string },
  enabled = true,
) {
  return useQuery({
    queryKey: ["servicos-unidade-paginado", params ?? {}],
    queryFn: () => servicosConfigService.listarServicosUnidadePaginado(params),
    enabled: Boolean(params?.unidade) && enabled,
  });
}

export function useCriarServicoUnidade() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      unidade: string;
      servico: string;
      dias_semana: string[];
      mesmo_expediente: boolean;
      hora_manha_inicio?: string | null;
      hora_manha_fim?: string | null;
      hora_tarde_inicio?: string | null;
      hora_tarde_fim?: string | null;
      is_active?: boolean;
    }) => {
      const { data } = await servicosConfigService.criarServicoUnidade(payload);
      if (data?.success === false) {
        throw new Error((data as unknown as { result?: string }).result || "Falha ao criar serviço");
      }
      return (data?.data ?? data?.result) as ServicoUnidadeCras;
    },
    onSuccess: (data) => {
      if (data?.unidade) {
        qc.invalidateQueries({ queryKey: queryKeys.servicosUnidade(data.unidade) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.servicosUnidadePaginado });
    },
  });
}

export function useAtualizarServicoUnidade() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ServicoUnidadeCras> }) => {
      const { data } = await servicosConfigService.atualizarServicoUnidade(id, payload);
      if (data?.success === false) {
        throw new Error((data as unknown as { result?: string }).result || "Falha ao atualizar serviço");
      }
      return (data?.data ?? data?.result) as ServicoUnidadeCras;
    },
    onSuccess: (data) => {
      if (data?.unidade) {
        qc.invalidateQueries({ queryKey: queryKeys.servicosUnidade(data.unidade) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.servicos });
      qc.invalidateQueries({ queryKey: queryKeys.servicosUnidadePaginado });
    },
  });
}

export function useRemoverServicoUnidade() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, unidade }: { id: string; unidade: string }) => {
      const { data } = await servicosConfigService.removerServicoUnidade(id);
      if (data?.success === false) {
        throw new Error((data as unknown as { result?: string }).result || "Falha ao remover serviço");
      }
      return { id, unidade };
    },
    onSuccess: ({ unidade }) => {
      if (unidade) {
        qc.invalidateQueries({ queryKey: queryKeys.servicosUnidade(unidade) });
      }
      qc.invalidateQueries({ queryKey: queryKeys.servicosUnidadePaginado });
    },
  });
}
