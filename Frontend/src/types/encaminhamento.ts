export type CodigoArea = {
  id: string;
  nome: string;
  codigo: number;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
};

export type CodigoAreaPayload = {
  nome: string;
  codigo: number;
  is_active?: boolean;
};

export type CodigoAreaParams = {
  search?: string;
  nome?: string;
  codigo?: number | string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
};

export type UnidadeResumoEncaminhamento = {
  id: string;
  nome: string;
  bairros_abrangencia?: Array<{ id?: string; nome?: string } | string>;
};

export type Encaminhamento = {
  id: string;
  codigo_area: string | CodigoArea;
  unidade_origem: string | UnidadeResumoEncaminhamento;
  unidade_origem_telefone?: string;
  unidade_destino: string | UnidadeResumoEncaminhamento;
  agendamento: string | Record<string, unknown>;
  motivo: string;
  resumo?: string | null;
  profissional?: string | null;
  orientacoes?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
};

export type EncaminhamentoPayload = {
  codigo_area: string;
  unidade_origem: string;
  unidade_destino: string;
  agendamento: string;
  motivo: string;
  resumo?: string | null;
  profissional?: string | null;
  orientacoes?: string | null;
  is_active?: boolean;
};

export type EncaminhamentoParams = {
  codigo_area?: string;
  unidade_origem?: string;
  unidade_destino?: string;
  agendamento?: string;
  profissional?: string;
  motivo?: string;
  is_active?: boolean;
};
