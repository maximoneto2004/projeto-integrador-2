import { api } from "@/services/api";
import type { FarmaciaResult } from "@/types/api";

type FarmaciaResponse = {
  success: boolean;
  results: FarmaciaResult;
  mensagem?: string;
};

export const farmaciaService = {
  obter(unidadeId: string) {
    return api.get<FarmaciaResponse>("/dashboard-farmacia/", { params: { unidade_id: unidadeId } });
  },
};
