import { useQuery } from "@tanstack/react-query";

import { logsService, type LogListParams, type LogListResponse, type LogRegistro } from "@/services/prontuario/logsService";

const queryKeys = {
  logs: (params?: LogListParams) => ["historico-prontuario-logs", params ?? {}] as const,
};

type ApiListEnvelope<T> = {
  result?: T[];
  results?: T[];
};

export type HistoricoProntuarioData = {
  logs: LogRegistro[];
  count: number;
  page: number;
  next: number | null;
  previous: number | null;
  date: string | null;
  filters: {
    secoes: string[];
    profissionais: string[];
    membros: Array<{ id: string; nome: string }>;
  };
};

function extractList<T>(payload: ApiListEnvelope<T> | T[] | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.results)) return payload.results;
  if (Array.isArray(payload.result)) return payload.result;
  return [];
}

export function useHistoricoProntuario(params?: LogListParams, enabled = true) {
  return useQuery<HistoricoProntuarioData>({
    queryKey: queryKeys.logs(params),
    queryFn: async () => {
      const { data } = await logsService.listar(params);
      if (typeof data === "object" && data && "success" in data && data.success === false) {
        throw new Error(data.mensagem || data.detail || "Falha ao carregar histórico do prontuário");
      }

      const payload = data as LogListResponse | ApiListEnvelope<LogRegistro> | LogRegistro[];
      const logs = extractList<LogRegistro>(payload as ApiListEnvelope<LogRegistro> | LogRegistro[]);

      const page = typeof payload === "object" && payload && "page" in payload ? Number(payload.page ?? params?.page ?? 1) : (params?.page ?? 1);

      return {
        logs,
        count: typeof payload === "object" && payload && "count" in payload ? Number(payload.count ?? 0) : 0,
        page: Number.isFinite(page) && page > 0 ? page : 1,
        next: typeof payload === "object" && payload && "next" in payload ? (payload.next ?? null) : null,
        previous: typeof payload === "object" && payload && "previous" in payload ? (payload.previous ?? null) : null,
        date: typeof payload === "object" && payload && "date" in payload ? (payload.date ?? null) : null,
        filters:
          typeof payload === "object" && payload && "filters" in payload && payload.filters
            ? {
                secoes: Array.isArray(payload.filters.secoes) ? payload.filters.secoes.filter(Boolean) : [],
                profissionais: Array.isArray(payload.filters.profissionais) ? payload.filters.profissionais.filter(Boolean) : [],
                membros: Array.isArray(payload.filters.membros)
                  ? payload.filters.membros
                      .map((m) => ({
                        id: String(m?.id ?? "").trim(),
                        nome: String(m?.nome ?? "").trim(),
                      }))
                      .filter((m) => m.id && m.nome)
                  : [],
              }
            : { secoes: [], profissionais: [], membros: [] },
      };
    },
    enabled,
  });
}
