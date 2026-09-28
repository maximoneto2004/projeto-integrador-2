import { api } from "@/services/api";

export type Medicamento = {
  id: string;
  nome: string;
  principio_ativo: string;
  forma_farmaceutica: string;
  forma_farmaceutica_display: string;
  concentracao: string;
  unidade_medida: string;
  unidade_medida_display: string;
  via_administracao: string;
  via_administracao_display: string;
  controlado: boolean;
  classe_terapeutica?: string | null;
  fabricante?: string | null;
  codigo_registro?: string | null;
  observacoes?: string | null;
  estoque_minimo: number;
  descricao_completa: string;
  is_active: boolean;
};

export type MedicamentoListParams = {
  busca?: string;
  is_active?: boolean;
  controlado?: boolean;
};

export type MedicamentoPayload = {
  nome: string;
  principio_ativo: string;
  forma_farmaceutica: string;
  concentracao: string;
  unidade_medida: string;
  via_administracao: string;
  controlado: boolean;
  classe_terapeutica?: string | null;
  fabricante?: string | null;
  codigo_registro?: string | null;
  observacoes?: string | null;
  estoque_minimo: number;
  is_active: boolean;
};

type ApiEnvelope<T> = { success?: boolean; result?: T };

const API_URL = import.meta.env.VITE_API_URL;

export const medicamentoService = {
  async listar(params?: MedicamentoListParams): Promise<Medicamento[]> {
    const { data } = await api.get<ApiEnvelope<Medicamento[]>>(`${API_URL}/medicamento/`, { params });
    return Array.isArray(data?.result) ? data.result : [];
  },

  async criar(payload: MedicamentoPayload): Promise<Medicamento> {
    const { data } = await api.post<ApiEnvelope<Medicamento>>(`${API_URL}/medicamento/`, payload);
    return data.result as Medicamento;
  },

  async atualizar(id: string, payload: Partial<MedicamentoPayload>): Promise<Medicamento> {
    const { data } = await api.patch<ApiEnvelope<Medicamento>>(`${API_URL}/medicamento/${id}`, payload);
    return data.result as Medicamento;
  },

  remover(id: string) {
    return api.delete(`${API_URL}/medicamento/${id}`);
  },
};
