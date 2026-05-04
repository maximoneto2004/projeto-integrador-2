import type { AxiosResponse } from "axios";

import { api } from "../api";
import type {
  CodigoArea,
  CodigoAreaParams,
  CodigoAreaPayload,
  Encaminhamento,
  EncaminhamentoParams,
  EncaminhamentoPayload,
} from "@/types/encaminhamento";

type ApiListResponse<T> = {
  success?: boolean;
  result?: T[];
  results?: T[];
  count?: number;
  next?: string | null;
  previous?: string | null;
  mensagem?: string;
};

type ApiDetailResponse<T> = {
  success?: boolean;
  result?: T;
  mensagem?: string;
  detail?: string;
};

const CODIGO_AREA_PATH = "/codigo-area/";
const ENCAMINHAMENTO_PATH = "/encaminhamento/";

export const encaminhamentoService = {
  listarCodigoAreas(params?: CodigoAreaParams): Promise<AxiosResponse<ApiListResponse<CodigoArea>>> {
    return api.get<ApiListResponse<CodigoArea>>(CODIGO_AREA_PATH, { params });
  },

  obterCodigoArea(id: string): Promise<AxiosResponse<ApiDetailResponse<CodigoArea>>> {
    return api.get<ApiDetailResponse<CodigoArea>>(`${CODIGO_AREA_PATH}${id}/`);
  },

  criarCodigoArea(payload: CodigoAreaPayload): Promise<AxiosResponse<ApiDetailResponse<CodigoArea>>> {
    return api.post<ApiDetailResponse<CodigoArea>>(CODIGO_AREA_PATH, payload);
  },

  atualizarCodigoArea(
    id: string,
    payload: Partial<CodigoAreaPayload>,
  ): Promise<AxiosResponse<ApiDetailResponse<CodigoArea>>> {
    return api.patch<ApiDetailResponse<CodigoArea>>(`${CODIGO_AREA_PATH}${id}/`, payload);
  },

  removerCodigoArea(id: string): Promise<AxiosResponse<ApiDetailResponse<CodigoArea>>> {
    return api.delete<ApiDetailResponse<CodigoArea>>(`${CODIGO_AREA_PATH}${id}/`);
  },

  listarEncaminhamentos(
    params?: EncaminhamentoParams,
  ): Promise<AxiosResponse<ApiListResponse<Encaminhamento>>> {
    return api.get<ApiListResponse<Encaminhamento>>(ENCAMINHAMENTO_PATH, { params });
  },

  obterEncaminhamento(id: string): Promise<AxiosResponse<ApiDetailResponse<Encaminhamento>>> {
    return api.get<ApiDetailResponse<Encaminhamento>>(`${ENCAMINHAMENTO_PATH}${id}/`);
  },

  criarEncaminhamento(
    payload: EncaminhamentoPayload,
  ): Promise<AxiosResponse<ApiDetailResponse<Encaminhamento>>> {
    return api.post<ApiDetailResponse<Encaminhamento>>(ENCAMINHAMENTO_PATH, payload);
  },

  atualizarEncaminhamento(
    id: string,
    payload: Partial<EncaminhamentoPayload>,
  ): Promise<AxiosResponse<ApiDetailResponse<Encaminhamento>>> {
    return api.patch<ApiDetailResponse<Encaminhamento>>(`${ENCAMINHAMENTO_PATH}${id}/`, payload);
  },

  removerEncaminhamento(id: string): Promise<AxiosResponse<ApiDetailResponse<Encaminhamento>>> {
    return api.delete<ApiDetailResponse<Encaminhamento>>(`${ENCAMINHAMENTO_PATH}${id}/`);
  },
};
