import { api } from "@/services/api";
import type { PainelChamada } from "@/types/painel";

type ApiEnvelope<T> = {
  success: boolean;
  result: T;
  mensagem?: string;
};

const API_URL = import.meta.env.VITE_API_URL;

export const painelService = {
  ultimasChamadas(params?: { unidadeId?: string; limite?: number }) {
    const query = {
      ...(params?.unidadeId ? { unidade_id: params.unidadeId } : {}),
      ...(typeof params?.limite === "number" ? { limite: params.limite } : {}),
    };

    return api.get<ApiEnvelope<PainelChamada[]>>(
      `${API_URL}/painel/ultimas-chamadas/`,
      { params: query },
    );
  },
};
