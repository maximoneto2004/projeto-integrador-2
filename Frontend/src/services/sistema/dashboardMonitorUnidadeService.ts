import { api } from "@/services/api";
import type { DashboardMonitorUnidadeResult } from "@/types/api";

type DashboardMonitorUnidadeResponse = {
    success: boolean;
    results: DashboardMonitorUnidadeResult;
    mensagem?: string;
};

export type DashboardMonitorUnidadeParams = {
    unidade_id: string;
    data_inicio: string;
    data_fim: string;
}

const API_URL = import.meta.env.VITE_API_URL;

export const dashboardMonitorUnidadeService = {
    obter(params: DashboardMonitorUnidadeParams) {
        return api.get<DashboardMonitorUnidadeResponse>(`${API_URL}/dashboard-monitor-unidade/`, { params });
    },
};