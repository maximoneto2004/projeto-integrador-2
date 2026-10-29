import { api } from "@/services/api";
import type { MeuDiaResult } from "@/types/api";

type MeuDiaResponse = {
  success: boolean;
  results: MeuDiaResult;
  mensagem?: string;
};

export type MeuDiaParams = {
  unidade_id: string;
  data: string;
};

export const meuDiaService = {
  obter(params: MeuDiaParams) {
    return api.get<MeuDiaResponse>("/dashboard-profissional/", { params });
  },
};
