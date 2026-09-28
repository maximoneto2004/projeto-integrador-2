import { api } from "@/services/api";
import type { TipoMovimentacao } from "@/constants/medicamentos";

export type Lote = {
  id: string;
  medicamento: string;
  medicamento_descricao: string;
  unidade: string;
  unidade_nome: string;
  numero_lote: string;
  validade: string;
  quantidade_inicial: number;
  quantidade_atual: number;
  fornecedor: string | null;
  data_entrada: string;
  vencido: boolean;
  is_active: boolean;
};

export type LotePayload = {
  medicamento: string;
  unidade: string;
  numero_lote: string;
  validade: string;
  quantidade_inicial: number;
  fornecedor?: string | null;
  data_entrada?: string;
};

export type LoteEdicaoPayload = Partial<Pick<Lote, "numero_lote" | "validade" | "fornecedor" | "is_active">>;

export type Movimentacao = {
  id: string;
  lote: string;
  lote_numero: string;
  medicamento_id: string;
  medicamento_descricao: string;
  unidade_id: string;
  tipo: TipoMovimentacao;
  tipo_display: string;
  quantidade: number;
  saldo_apos: number;
  usuario: string | null;
  usuario_nome: string | null;
  data: string;
  motivo: string | null;
  receita_item: string | null;
};

export type MovimentacaoPayload = {
  lote: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  motivo?: string | null;
};

export type DispensacaoPayload = {
  unidade: string;
  receita_item?: string;
  medicamento?: string;
  quantidade?: number;
  motivo?: string | null;
};

export type Saldo = {
  medicamento_id: string;
  medicamento: string;
  unidade_id: string;
  unidade: string;
  saldo_disponivel: number;
  saldo_vencido: number;
  estoque_minimo: number;
  abaixo_minimo: boolean;
};

export type Alertas = {
  estoque_baixo: Saldo[];
  vencendo: Lote[];
  vencidos: Lote[];
};

type ApiEnvelope<T> = { success?: boolean; result: T };
type Filtros = Record<string, string | number | boolean | undefined>;

const limpar = (params?: Filtros) =>
  Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v !== undefined && v !== ""));

export const estoqueService = {
  async listarLotes(params?: Filtros): Promise<Lote[]> {
    const { data } = await api.get<ApiEnvelope<Lote[]>>(`/estoque/lote/`, { params: limpar(params) });
    return data.result ?? [];
  },

  async criarLote(payload: LotePayload): Promise<Lote> {
    const { data } = await api.post<ApiEnvelope<Lote>>(`/estoque/lote/`, payload);
    return data.result;
  },

  async atualizarLote(id: string, payload: LoteEdicaoPayload): Promise<Lote> {
    const { data } = await api.patch<ApiEnvelope<Lote>>(`/estoque/lote/${id}`, payload);
    return data.result;
  },

  async listarMovimentacoes(params?: Filtros): Promise<Movimentacao[]> {
    const { data } = await api.get<ApiEnvelope<Movimentacao[]>>(`/estoque/movimentacao/`, {
      params: limpar(params),
    });
    return data.result ?? [];
  },

  async movimentar(payload: MovimentacaoPayload): Promise<Movimentacao> {
    const { data } = await api.post<ApiEnvelope<Movimentacao>>(`/estoque/movimentacao/`, payload);
    return data.result;
  },

  async dispensar(payload: DispensacaoPayload): Promise<Movimentacao[]> {
    const { data } = await api.post<ApiEnvelope<Movimentacao[]>>(`/estoque/dispensar/`, payload);
    return data.result;
  },

  async saldo(params?: Filtros): Promise<Saldo[]> {
    const { data } = await api.get<ApiEnvelope<Saldo[]>>(`/estoque/saldo/`, { params: limpar(params) });
    return data.result ?? [];
  },

  async alertas(params?: Filtros): Promise<Alertas> {
    const { data } = await api.get<ApiEnvelope<Alertas>>(`/estoque/alertas/`, { params: limpar(params) });
    return data.result;
  },
};
