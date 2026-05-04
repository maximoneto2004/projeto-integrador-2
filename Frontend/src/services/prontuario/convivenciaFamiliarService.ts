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

export type ConvivenciaFamiliarPayload = {
  prontuario: string;
  tempo_estado?: number;
  estado?: boolean;
  tempo_municipio?: number;
  municipio?: boolean;
  tempo_bairro?: number;
  bairro?: boolean;
  vitima_ameaca?: string;
  parente_proximo?: string;
  vizinhos_apoio?: string;
  grupo_religioso?: string;
  movimento_social?: string;
  atividade_lazer_crianca?: string;
  atividade_lazer_idoso?: string;
  companhia_adulto?: string;
  conflitos_conjugais?: string;
  conflitos_responsaveis?: string;
  conflitos_irmaos?: string;
  conflitos_outros?: string;
  outras_observacoes?: string;
};

export type ConvivenciaFamiliarResponse = ConvivenciaFamiliarPayload & {
  id: string;
};

export const convivenciaFamiliarService = {
  listar(params?: { prontuario?: string }) {
    return api.get<
      | ApiEnvelope<ConvivenciaFamiliarResponse[] | string[]>
      | ConvivenciaFamiliarResponse[]
      | string[]
    >(buildUrl("/api/prontuario/convivencia-familiar/"), { params });
  },
  criar(payload: ConvivenciaFamiliarPayload) {
    return api.post<ApiEnvelope<ConvivenciaFamiliarResponse> | ConvivenciaFamiliarResponse>(
      buildUrl("/api/prontuario/convivencia-familiar/"),
      payload
    );
  },
  atualizar(id: string, payload: Partial<ConvivenciaFamiliarPayload>) {
    return api.patch<ApiEnvelope<ConvivenciaFamiliarResponse> | ConvivenciaFamiliarResponse>(
      buildUrl(`/api/prontuario/convivencia-familiar/${id}`),
      payload
    );
  },
};

