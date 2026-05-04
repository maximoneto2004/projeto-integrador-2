import type { AxiosResponse } from "axios";
import { api } from "@/services/api";
import type { GuicheDefineRequest, GuicheDefineResponse, GuicheListResponse } from "@/types/api";

const GUICHE_DEF_PATH = "/guiches/definir/";
const GUICHE_LIST_PATH = "/guiches/";
const GUICHE_LIST_ADMIN_PATH = "/guiches/list/";

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  result?: T;
  mensagem?: string;
};

type ApiPaginatedEnvelope<T> = {
  count?: number;
  next?: string | null;
  previous?: string | null;
  results?: T;
};

export type GuicheAdminPayload = {
  nome: string;
  unidade: string;
  is_active?: boolean;
};

export type GuicheAdminResponse = {
  id: string;
  nome: string;
  unidade: string;
  is_active?: boolean;
};

export type GuicheAdminListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  payload: ApiEnvelope<GuicheAdminResponse[] | unknown> | GuicheAdminResponse[] | unknown;
};

export const guicheService = {
  definir(payload: GuicheDefineRequest): Promise<AxiosResponse<GuicheDefineResponse>> {
    return api.post<GuicheDefineResponse>(GUICHE_DEF_PATH, payload);
  },

  listar(): Promise<AxiosResponse<GuicheListResponse>> {
    return api.get<GuicheListResponse>(GUICHE_LIST_PATH);
  },

  async listarAdmin(params?: { unidade?: string; nome?: string; limit?: string; offset?: string }): Promise<GuicheAdminListResponse> {
    const res = await api.get<
      ApiEnvelope<GuicheAdminResponse[] | unknown> | ApiPaginatedEnvelope<ApiEnvelope<GuicheAdminResponse[] | unknown> | GuicheAdminResponse[] | unknown>
    >(GUICHE_LIST_ADMIN_PATH, { params });
    const body = res.data as Record<string, unknown>;

    const isPaginated = "count" in body && "results" in body;
    if (isPaginated) {
      return {
        count: typeof body.count === "number" ? body.count : 0,
        next: typeof body.next === "string" ? body.next : null,
        previous: typeof body.previous === "string" ? body.previous : null,
        payload: body.results as ApiEnvelope<GuicheAdminResponse[] | unknown> | GuicheAdminResponse[] | unknown,
      };
    }

    return {
      count: 0,
      next: null,
      previous: null,
      payload: res.data as ApiEnvelope<GuicheAdminResponse[] | unknown> | GuicheAdminResponse[] | unknown,
    };
  },

  criar(payload: GuicheAdminPayload): Promise<AxiosResponse<ApiEnvelope<GuicheAdminResponse>>> {
    return api.post<ApiEnvelope<GuicheAdminResponse>>(GUICHE_LIST_ADMIN_PATH, payload);
  },

  atualizar(id: string, payload: Partial<GuicheAdminPayload>): Promise<AxiosResponse<ApiEnvelope<GuicheAdminResponse>>> {
    return api.patch<ApiEnvelope<GuicheAdminResponse>>(`${GUICHE_LIST_PATH}${id}/`, payload);
  },

  remover(id: string): Promise<AxiosResponse<ApiEnvelope<unknown>>> {
    return api.delete<ApiEnvelope<unknown>>(`${GUICHE_LIST_PATH}${id}/`);
  },
};
