export interface ServicoConfig {
  servicoId: string;
  diasSemana: string[];
  turno1Inicio: string;
  turno1Fim: string;
  turno2Inicio: string;
  turno2Fim: string;
  usarExpedienteCras: boolean;
  ativo: boolean;
}

export interface ServicoConfigurado {
  id: string;
  servicoId?: string;
  nome: string;
  tipo: string;
  diasSemana: string[];
  horarios: string;
  ativo: boolean;
}

export type ClasseServicoListParams = {
  nome?: string;
  tipo_servico?: string;
  tipo_servico_id?: string;
  classe_id?: string;
  servico_id?: string;
  unidade?: string;
  page?: number;
  page_size?: number;
};
