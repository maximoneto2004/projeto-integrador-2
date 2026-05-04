import { api } from "@/services/api";

export type ProntuarioCreatePayload = {
    unidade_inicial: string;
};

export type ProntuarioListParams = {
    search?: string;
    unidade_inicial?: string;
    limit?: number;
    offset?: number;
};

export type BeneficioSocial = {
    id?: string;
    nome?: string;
    descricao?: string;
};

const PRONTUARIO_BASE_URL = (import.meta.env.VITE_API_URL || "")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/$/, "");

type ApiEnvelope<T> = {
    success?: boolean;
    result?: T;
    mensagem?: string;
    detail?: string;
};

export const prontuarioService = {
    listar(params?: ProntuarioListParams) {
        const url = PRONTUARIO_BASE_URL
            ? `${PRONTUARIO_BASE_URL}/api/prontuario/prontuario/`
            : "/api/prontuario/prontuario/";
        return api.get<ApiEnvelope<unknown> | unknown>(url, { params });
    },
    obter(id: string) {
        const url = PRONTUARIO_BASE_URL
            ? `${PRONTUARIO_BASE_URL}/api/prontuario/prontuario/${id}`
            : `/api/prontuario/prontuario/${id}/`;
        return api.get<ApiEnvelope<unknown> | unknown>(url);
    },
    criar(payload: ProntuarioCreatePayload) {
        const url = PRONTUARIO_BASE_URL
            ? `${PRONTUARIO_BASE_URL}/api/prontuario/prontuario/`
            : "/api/prontuario/prontuario/";
        return api.post<ApiEnvelope<unknown> | unknown>(url, payload);
    },
    listarBeneficiosSociais() {
        const url = PRONTUARIO_BASE_URL
            ? `${PRONTUARIO_BASE_URL}/api/prontuario/beneficio-social/`
            : "/api/prontuario/beneficio-social/";
        return api.get<ApiEnvelope<BeneficioSocial[] | string[]> | BeneficioSocial[] | string[]>(url);
    },
    criarBeneficioSocial(payload: { nome: string }) {
        const url = PRONTUARIO_BASE_URL
            ? `${PRONTUARIO_BASE_URL}/api/prontuario/beneficio-social/`
            : "/api/prontuario/beneficio-social/";
        return api.post<ApiEnvelope<BeneficioSocial> | BeneficioSocial | unknown>(url, payload);
    },
};
