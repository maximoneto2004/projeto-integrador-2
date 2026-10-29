export type MedicamentoMapa = {
  id: string;
  nome: string;
  concentracao: string;
  unidade_medida: string;
  forma_farmaceutica: string;
  solicitacoes: number;
};

export type DemandaUnidade = {
  unidade_id: string;
  nome: string;
  solicitacoes: number;
  quantidade_prescrita: number | null;
  quantidade_dispensada: number;
  itens_sem_quantidade: number;
};

export type AnaliseUnidade = {
  media_min: number | null;
  medidos: number;
  concluidos: number;
  servicos: Array<{
    id: string;
    nome: string;
    ofertado: boolean;
    concluidos: number;
    medidos: number;
    media_min: number | null;
    meta_min: number | null;
  }>;
  medicamentos: Array<MedicamentoMapa & Omit<DemandaUnidade, "unidade_id" | "nome">>;
  itens_legados_sem_catalogo: number;
};

export type MapaMedicamentosResult = {
  data_inicio: string;
  data_fim: string;
  medicamento: MedicamentoMapa | null;
  medicamentos: MedicamentoMapa[];
  unidades: DemandaUnidade[];
  total_solicitacoes: number;
  maior_demanda: number;
};

export type MapaMedicamentosParams = {
  data_inicio: string;
  data_fim: string;
  medicamento_id?: string;
};

// Indicadores por bairro de residência (dashboard/mapa_bairros.py).
export type BairroIndicadores = {
  bairro_id: string;
  nome: string;
  chave: string;
  agendamentos: number;
  consultas: number;
  pacientes: number;
  ausentes: number;
  absenteismo: number | null;
  base_absenteismo: number;
  consultas_fora_territorio: number;
  pct_fora_territorio: number | null;
  pacientes_cronicos: number;
  unidades_referencia: Array<{ id: string; nome: string }>;
  atendidos_em: Array<{ unidade: string; consultas: number }>;
};

export type MapaBairrosResult = {
  data_inicio: string;
  data_fim: string;
  bairros: BairroIndicadores[];
  sem_bairro: { agendamentos: number; consultas: number };
};
