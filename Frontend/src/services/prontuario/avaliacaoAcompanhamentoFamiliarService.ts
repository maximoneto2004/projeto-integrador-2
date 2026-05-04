import { api } from "@/services/api";

type ApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  mensagem?: string;
  detail?: string;
};

const PRONTUARIO_BASE_URL = (import.meta.env.VITE_API_URL || "")
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/$/, "");

const buildUrl = (path: string) =>
  PRONTUARIO_BASE_URL ? `${PRONTUARIO_BASE_URL}${path}` : path;

export type AvaliacaoAcompanhamentoFamiliarPayload = {
  prontuario: string;
  ofertas_assistencia?: string;
  encaminhamentos?: string;
  vinculo_familia?: string;
  status?: string;
  analise?: string;
};

export type AvaliacaoAcompanhamentoFamiliarResponse =
  AvaliacaoAcompanhamentoFamiliarPayload & {
    id: string;
  };

export const avaliacaoAcompanhamentoFamiliarService = {
  listar(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<AvaliacaoAcompanhamentoFamiliarResponse[] | string[]>
      | AvaliacaoAcompanhamentoFamiliarResponse[]
      | string[]
    >(buildUrl("/api/prontuario/avaliacao-acompanhamento-familiar/"), { params });
  },
  criar(payload: AvaliacaoAcompanhamentoFamiliarPayload) {
    return api.post<
      | ApiEnvelope<AvaliacaoAcompanhamentoFamiliarResponse>
      | AvaliacaoAcompanhamentoFamiliarResponse
    >(buildUrl("/api/prontuario/avaliacao-acompanhamento-familiar/"), payload);
  },
  atualizar(id: string, payload: Partial<AvaliacaoAcompanhamentoFamiliarPayload>) {
    return api.patch<
      | ApiEnvelope<AvaliacaoAcompanhamentoFamiliarResponse>
      | AvaliacaoAcompanhamentoFamiliarResponse
    >(buildUrl(`/api/prontuario/avaliacao-acompanhamento-familiar/${id}`), payload);
  },
};
