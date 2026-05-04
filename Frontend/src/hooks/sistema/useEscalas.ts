import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { escalaService } from "@/services/sistema/escalaService";
import type { CriarEscalaPayload, EscalaApi } from "@/types/escalas";

const queryKeys = {
  lista: ["escalas"] as const,
};

type EscalasParams = {
  profissional?: string;
  unidade?: string;
};
type CriarEscalaParams = {
  payload: CriarEscalaPayload;
};
type AtualizarEscalaParams = {
  id: string;
  payload: Partial<CriarEscalaPayload>;
};
type RemoverEscalaParams = {
  id: string;
};

export function useEscalas(params?: EscalasParams, enabled = true) {
  return useQuery<EscalaApi[]>({
    queryKey: [...queryKeys.lista, params ?? {}],
    queryFn: () => escalaService.listar(params),
    enabled,
  });
}

export function useCreateEscala() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }: CriarEscalaParams) => escalaService.criar(payload),

    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}

export function useAtualizarEscala() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: AtualizarEscalaParams) => escalaService.atualizar(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}

export function useRemoverEscala() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: RemoverEscalaParams) => escalaService.remover(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lista });
    },
  });
}
