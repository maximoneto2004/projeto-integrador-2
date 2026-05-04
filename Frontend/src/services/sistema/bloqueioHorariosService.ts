import { api } from "@/services/api";
import type { BloqueioHorario, CriarBloqueioHorarioPayload, BloqueioHorarioPayload } from "@/types/bloqueioHorario";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type ApiPaginatedResponse<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T;
};

type BloqueioListParams = {
  unidade?: string;
  limit?: number;
  offset?: number;
};

export type BloqueiosPaginados = {
  items: BloqueioHorario[];
  count: number;
  next: string | null;
  previous: string | null;
};

export const bloqueioHorarioService = {
  async listar(params?: BloqueioListParams): Promise<BloqueiosPaginados> {
    const { data } = await api.get<
      ApiResponse<BloqueioHorario[]>
      | ApiPaginatedResponse<ApiResponse<BloqueioHorario[]>>
      | ApiPaginatedResponse<ApiResponse<BloqueioHorario[]> | BloqueioHorario[]>
    >("/bloqueio_horario/", { params });

    const body = (data && typeof data === "object" ? (data as Record<string, unknown>) : {}) as Record<string, unknown>;
    const isPaginated = "count" in body && "results" in body;

    if (!isPaginated) {
      const items = Array.isArray((data as ApiResponse<BloqueioHorario[]>)?.data)
        ? ((data as ApiResponse<BloqueioHorario[]>).data as BloqueioHorario[])
        : [];
      return {
        items,
        count: items.length,
        next: null,
        previous: null,
      };
    }

    const payload = body.results as ApiResponse<BloqueioHorario[]> | BloqueioHorario[] | undefined;
    let items: BloqueioHorario[] = [];
    if (Array.isArray(payload)) {
      items = payload;
    } else if (payload && typeof payload === "object" && Array.isArray((payload as ApiResponse<BloqueioHorario[]>).data)) {
      items = ((payload as ApiResponse<BloqueioHorario[]>).data as BloqueioHorario[]) ?? [];
    }

    return {
      items,
      count: typeof body.count === "number" ? body.count : items.length,
      next: typeof body.next === "string" ? body.next : null,
      previous: typeof body.previous === "string" ? body.previous : null,
    };
  },

  criar(payload: CriarBloqueioHorarioPayload) {
    return api.post<ApiResponse<BloqueioHorario>>("/bloqueio_horario/", payload).then((res) => res.data.data);
  },

  atualizar(id: string, payload: BloqueioHorarioPayload) {
    return api.patch(`/bloqueio_horario/${id}/`, payload).then((res) => res.data.data);
  },
};
