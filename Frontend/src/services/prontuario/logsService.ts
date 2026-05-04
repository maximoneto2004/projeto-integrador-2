import { api } from "@/services/api";

type ApiEnvelope<T> = {
  success?: boolean;
  result?: T;
  results?: T;
  mensagem?: string;
  detail?: string;
};

export type LogActionFlag = 1 | 2 | 3;

export type LogRegistro = {
  action_time: string;
  user_display: string;
  user_username: string;
  content_type_app_label: string;
  content_type_model: string;
  prontuario_step?: string;
  membro?: {
    id?: string;
    nome?: string;
  } | null;
  object_repr: string;
  action_flag: LogActionFlag;
  change_message: Record<string, unknown>;
};

export type LogListParams = {
  prontuario_id?: string;
  content_type_model?: string;
  membro?: string;
  user_display?: string;
  data_inicial?: string;
  data_final?: string;
  search?: string;
  page?: number;
};

const LOGS_URL = "/logs/";

export type LogListResponse = {
  success?: boolean;
  count?: number;
  next?: number | null;
  previous?: number | null;
  page?: number;
  date?: string | null;
  filters?: {
    secoes?: string[];
    profissionais?: string[];
    membros?: Array<{ id: string; nome: string }>;
  };
  result?: LogRegistro[];
  results?: LogRegistro[];
  mensagem?: string;
  detail?: string;
};

export const logsService = {
  listar(params?: LogListParams) {
    return api.get<ApiEnvelope<LogRegistro[]> | LogRegistro[] | LogListResponse>(LOGS_URL, { params });
  },
};
