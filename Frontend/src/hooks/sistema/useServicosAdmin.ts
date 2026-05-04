import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { classeServicoService } from "@/services/sistema/classeServicoService";
import { servicoAdminService, type ServicoPayload } from "@/services/sistema/servicoAdminService";
import { tipoServicoService } from "@/services/sistema/tipoServicoService";
import type { ClasseServicoResumo, Servico, ServicoDetalhado, TipoServicoResumo } from "@/types/api";
import { ClasseServicoListParams } from "@/types/servicos";

const queryKeys = {
  classes: ["classes-servico"] as const,
  tipos: ["tipos-servico"] as const,
  servicos: ["servicos"] as const,
};

function unwrapEnvelope<T>(data: { success?: boolean; data?: T; result?: T }) {
  if (data?.success === false) {
    throw new Error((data as { result?: string }).result || "Falha na requisição.");
  }
  return data?.data ?? data?.result;
}

export function useClassesServico(params?: ClasseServicoListParams, enabled = true) {
  return useQuery<ClasseServicoResumo[]>({
    queryKey: [...queryKeys.classes, params],
    queryFn: () => classeServicoService.listar(params ?? {}),
    enabled,
  });
}

export function useTiposServico(params?: ClasseServicoListParams, enabled = true) {
  return useQuery<TipoServicoResumo[]>({
    queryKey: [...queryKeys.tipos, params],
    queryFn: () => tipoServicoService.listar(params ?? {}),
    enabled,
  });
}

export function useServicosAdmin(params?: ClasseServicoListParams, enabled = true) {
  return useQuery<ServicoDetalhado[]>({
    queryKey: [...queryKeys.servicos, params],
    queryFn: () => servicoAdminService.listar(params ?? {}),
    enabled,
  });
}

export function useCriarClasseServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nome: string; descricao?: string | null; is_active?: boolean }) => {
      const { data } = await classeServicoService.criar(payload);
      return unwrapEnvelope<ClasseServicoResumo>(data) as ClasseServicoResumo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.classes });
      qc.invalidateQueries({ queryKey: queryKeys.servicos });
    },
  });
}

export function useAtualizarClasseServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: { nome?: string; descricao?: string | null; is_active?: boolean } }) => {
      const { data } = await classeServicoService.atualizar(id, payload);
      return unwrapEnvelope<ClasseServicoResumo>(data) as ClasseServicoResumo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.classes });
      qc.invalidateQueries({ queryKey: queryKeys.servicos });
    },
  });
}

export function useCriarTipoServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { nome: string; descricao?: string | null; tempo_atendimento?: number; is_active?: boolean }) => {
      const { data } = await tipoServicoService.criar(payload);
      return unwrapEnvelope<TipoServicoResumo>(data) as TipoServicoResumo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tipos });
      qc.invalidateQueries({ queryKey: queryKeys.servicos });
    },
  });
}

export function useAtualizarTipoServico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: { nome?: string; descricao?: string | null; tempo_atendimento?: number; is_active?: boolean };
    }) => {
      const { data } = await tipoServicoService.atualizar(id, payload);
      return unwrapEnvelope<TipoServicoResumo>(data) as TipoServicoResumo;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.tipos });
      qc.invalidateQueries({ queryKey: queryKeys.servicos });
    },
  });
}

export function useCriarServicoAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: ServicoPayload) => {
      const { data } = await servicoAdminService.criar(payload);
      return unwrapEnvelope<Servico>(data) as Servico;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servicos });
    },
  });
}

export function useAtualizarServicoAdmin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<ServicoPayload> }) => {
      const { data } = await servicoAdminService.atualizar(id, payload);
      return unwrapEnvelope<Servico>(data) as Servico;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.servicos });
    },
  });
}
