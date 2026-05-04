import { api } from "@/services/api";

export type MapaUnidadeMetricasApi = {
  nota_avaliacao_media?: number | null;
  atendimentos_total?: number | null;
  atendimentos_comum_30d?: number | null;
  atendimentos_especializado_30d?: number | null;
  profissionais_total?: number | null;
  profissionais?:
    | Array<{
        id?: string;
        nome?: string;
        nota_media?: number | null;
        total_avaliacoes?: number | null;
        profissional?: {
          id?: string;
          nome_completo?: string;
          cpf?: string;
          telefone?: string;
          email?: string;
          groups?: Array<{ id?: string; name?: string }> | null;
        } | null;
      }>
    | null;
  tempo_medio_atendimento_min?: number | null;
  tempo_medio_esperado_min?: number | null;
  tempo_medio_atendimento_comum_min?: number | null;
  tempo_medio_atendimento_especializado_min?: number | null;
  tempo_medio_esperado_comum_min?: number | null;
  tempo_medio_esperado_especializado_min?: number | null;
  origem_atendimentos?: Record<string, number> | null;
  servicos_distintos_30d?: number | null;
  servicos_prestados_30d?: number | null;
  tempo_medio_espera_min?: number | null;
  tempo_excedente_medio_min?: number | null;
  pct_acima_esperado?: number | null;
} | null;

export type MapaUnidadeApi = {
  id: string;
  nome: string;
  logradouro: string;
  numero: string;
  complemento?: string | null;
  cep: string;
  bairro?: { id?: string; nome?: string } | null;
  telefone: string;
  email: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  bairros_abrangencia?: Array<{ id: string; nome: string }> | null;
  created_at?: string | null;
  metricas?: MapaUnidadeMetricasApi;
};

type ApiEnvelope<T> = {
  success?: boolean;
  mensagem?: string;
  result?: T | T[];
  results?: T[] | { result?: T[]; unidades?: T[] };
};

export type MapaUnidadesListParams = {
  data_inicio?: string;
  data_fim?: string;
  nome?: string;
  bairro?: string;
};

const extractList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as ApiEnvelope<T>;
  if (Array.isArray(obj.result)) return obj.result as T[];
  if (Array.isArray(obj.results)) return obj.results as T[];

  if (obj.results && typeof obj.results === "object") {
    const nested = obj.results as { result?: unknown; unidades?: unknown };
    if (Array.isArray(nested.result)) return nested.result as T[];
    if (Array.isArray(nested.unidades)) return nested.unidades as T[];
  }

  return [];
};

const extractItem = <T,>(payload: unknown): T | null => {
  if (!payload || typeof payload !== "object") return null;
  const obj = payload as ApiEnvelope<T>;
  if (obj.result && !Array.isArray(obj.result) && typeof obj.result === "object") {
    return obj.result as T;
  }
  return payload as T;
};

export const mapaUnidadesService = {
  async listar(params?: MapaUnidadesListParams): Promise<MapaUnidadeApi[]> {
    const { data } = await api.get<ApiEnvelope<MapaUnidadeApi> | MapaUnidadeApi[]>("/mapa_unidades/", { params });
    return extractList<MapaUnidadeApi>(data);
  },

  async obter(id: string, params?: Omit<MapaUnidadesListParams, "nome" | "bairro">): Promise<MapaUnidadeApi | null> {
    const { data } = await api.get<ApiEnvelope<MapaUnidadeApi> | MapaUnidadeApi>(`/mapa_unidades/${id}/`, { params });
    return extractItem<MapaUnidadeApi>(data);
  },
};
