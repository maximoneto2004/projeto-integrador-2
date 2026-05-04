import type { AxiosResponse } from "axios";
import { api } from "../api";
import type { CidadaoPayload } from "@/types/api";

const CIDADAOS_PATH = "/cidadaos/";
const CIDADAO_DETAIL_PATH = "/cidadao/";

type CidadaoApi = CidadaoPayload & {
  id: string;
  data_nascimento?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
};

type ListarCidadaosParams = {
  cpf?: string;
  search?: string;
  limit?: number;
  offset?: number;
};

type ListarCidadaosResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: CidadaoApi[];
};

export const cidadaoService = {
  listar(params?: ListarCidadaosParams): Promise<AxiosResponse<ListarCidadaosResponse>> {
    return api.get<ListarCidadaosResponse>(CIDADAOS_PATH, { params });
  },

  criar(payload: CidadaoPayload): Promise<AxiosResponse<CidadaoApi>> {
    return api.post<CidadaoApi>(CIDADAOS_PATH, payload);
  },

  obter(id: string): Promise<AxiosResponse<CidadaoApi>> {
    return api.get<CidadaoApi>(`${CIDADAO_DETAIL_PATH}${id}/`);
  },

  atualizar(id: string, payload: Partial<CidadaoPayload>): Promise<AxiosResponse<CidadaoApi>> {
    return api.patch<CidadaoApi>(`${CIDADAO_DETAIL_PATH}${id}/`, payload);
  },

  deletar(id: string): Promise<AxiosResponse> {
    return api.delete(`${CIDADAO_DETAIL_PATH}${id}/`);
  },
};
