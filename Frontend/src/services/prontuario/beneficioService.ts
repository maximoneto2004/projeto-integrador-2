import { api } from "@/services/api";

export type BeneficioSocial = {
    id?: string;
    nome?: string;
    descricao?: string;
    is_active?: boolean;
};

export type BeneficioSocialPayload = {
    nome: string;
    descricao?: string;
    is_active?: boolean;
};

const PRONTUARIO_BASE_URL = (import.meta.env.VITE_API_URL || "")
    .replace(/\/api\/v1\/?$/, "")
    .replace(/\/$/, "");

type ApiEnvelope<T> = {
    success?: boolean;
    count?: number;
    next?: string | null;
    previous?: string | null;
    result?: T;
    results?: T;
    data?: T;
    mensagem?: string;
    detail?: string;
};

export type BeneficioSocialListParams = {
    search?: string;
    limit?: number;
    offset?: number;
};

export const beneficioService = {
    listarBeneficiosSociais(params?: BeneficioSocialListParams) {
        const url = PRONTUARIO_BASE_URL
            ? `${PRONTUARIO_BASE_URL}/api/prontuario/beneficio-social/`
            : "/api/prontuario/beneficio-social/";
        return api.get<ApiEnvelope<BeneficioSocial[] | string[]> | BeneficioSocial[] | string[]>(url, { params });
    },
    criarBeneficioSocial(payload: BeneficioSocialPayload) {
        const url = PRONTUARIO_BASE_URL
            ? `${PRONTUARIO_BASE_URL}/api/prontuario/beneficio-social/`
            : "/api/prontuario/beneficio-social/";
        return api.post<ApiEnvelope<BeneficioSocial> | BeneficioSocial | unknown>(url, payload);
    },
    atualizarBeneficioSocial(id: string, payload: Partial<BeneficioSocialPayload>) {
        const url = PRONTUARIO_BASE_URL
            ? `${PRONTUARIO_BASE_URL}/api/prontuario/beneficio-social/${id}/`
            : `/api/prontuario/beneficio-social/${id}/`;
        return api.patch<ApiEnvelope<BeneficioSocial> | BeneficioSocial | unknown>(url, payload);
    },
    removerBeneficioSocial(id: string) {
        const url = PRONTUARIO_BASE_URL
            ? `${PRONTUARIO_BASE_URL}/api/prontuario/beneficio-social/${id}/`
            : `/api/prontuario/beneficio-social/${id}/`;
        return api.delete<ApiEnvelope<unknown> | unknown>(url);
    },
};
