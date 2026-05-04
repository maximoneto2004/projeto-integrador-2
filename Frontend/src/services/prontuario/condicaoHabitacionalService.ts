import { api } from "@/services/api";

export type CondicaoHabitacionalPayload = {
  prontuario: string;
  tipo_residencia: string;
  material?: string;
  acesso_eletrico?: string;
  agua_canalizada?: string;
  abastecimento_agua?: string;
  esgotamento?: string;
  coleta?: string;
  total_comodos?: number;
  total_dormitorios?: number;
  media_dormitorios?: number | null;
  locomocao?: string;
  area_risco?: string;
  dificil_acesso?: string;
  area_conflito?: string;
  outras_observacoes?: string;
};

export type CondicaoHabitacionalResponse = CondicaoHabitacionalPayload & {
  id: string;
};

type ApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  mensagem?: string;
  detail?: string;
};

const PRONTUARIO_BASE_URL = (import.meta.env.VITE_API_URL || "")
  .replace(/\/api\/v1\/?$/, "")
  .replace(/\/$/, "");

export const condicaoHabitacionalService = {
  listar(params?: { prontuario?: string }) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/condicao-habitacional/`
      : "/api/prontuario/condicao-habitacional/";
    return api.get<ApiEnvelope<CondicaoHabitacionalResponse[] | string[]> | CondicaoHabitacionalResponse[] | string[]>(
      url,
      { params }
    );
  },
  criar(payload: CondicaoHabitacionalPayload) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/condicao-habitacional/`
      : "/api/prontuario/condicao-habitacional/";
    return api.post<ApiEnvelope<CondicaoHabitacionalResponse> | CondicaoHabitacionalResponse>(url, payload);
  },
  atualizar(id: string, payload: Partial<CondicaoHabitacionalPayload>) {
    const url = PRONTUARIO_BASE_URL
      ? `${PRONTUARIO_BASE_URL}/api/prontuario/condicao-habitacional/${id}`
      : `/api/prontuario/condicao-habitacional/${id}/`;
    return api.patch<ApiEnvelope<CondicaoHabitacionalResponse> | CondicaoHabitacionalResponse>(url, payload);
  },
};
