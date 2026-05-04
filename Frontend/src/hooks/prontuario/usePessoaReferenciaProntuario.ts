import { useMutation } from "@tanstack/react-query";
import {
  pessoaReferenciaService,
  type PessoaReferenciaPayload,
  type PessoaReferenciaResponse,
} from "@/services/prontuario/pessoaReferenciaService";

type SalvarParams = {
  id?: string;
  payload: PessoaReferenciaPayload;
};

function unwrapEnvelope(
  data: PessoaReferenciaResponse | { result?: PessoaReferenciaResponse } | null | undefined
) {
  if (!data) return null;
  if (typeof data === "object" && "result" in data) {
    return (data as { result?: PessoaReferenciaResponse }).result ?? null;
  }
  return data as PessoaReferenciaResponse;
}

export function usePessoaReferenciaProntuario() {
  return useMutation({
    mutationFn: async ({ id, payload }: SalvarParams) => {
      const res = id
        ? await pessoaReferenciaService.atualizar(id, payload)
        : await pessoaReferenciaService.criar(payload);
      return unwrapEnvelope(res.data);
    },
  });
}
