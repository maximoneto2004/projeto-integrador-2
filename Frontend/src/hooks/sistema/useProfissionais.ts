import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usuarioService } from "@/services/sistema/profissionalService";

type ProfissionaisParams = {
  unidade?: string;
  nome_completo?: string;
  cpf?: string;
  limit?: string;
  offset?: string;
};

type AtualizarProfissionalParams = {
  id: string;
  payload: Record<string, unknown>;
};

type criarProfissionalParams = {
  payload: Record<string, unknown>;
};

const queryKeys = {
  lista: ["profissionais"] as const,
};

export function useCargosProfissionais(params?: Record<string, string | undefined>) {
  return useQuery({
    queryKey: ["cargos_profissionais", params ?? {}],
    queryFn: () => usuarioService.listarCargos(params),
  });
}

export function useProfissionais(params?: ProfissionaisParams, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.lista, params ?? {}],
    queryFn: () => usuarioService.listar(params),
    enabled,
  });
}

export function useProfissionaisPaginados(params?: ProfissionaisParams, enabled = true) {
  return useQuery({
    queryKey: [...queryKeys.lista, "paginado", params ?? {}],
    queryFn: () => usuarioService.listarPaginado(params),
    enabled,
  });
}

export function useCreateProfissional() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }: criarProfissionalParams) => usuarioService.criar(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}

export function useAtualizarProfissional() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: AtualizarProfissionalParams) => usuarioService.atualizar(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}

export function useAtivarProfissional() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usuarioService.ativar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}

export function useDesativarProfissional() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => usuarioService.desativar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}
