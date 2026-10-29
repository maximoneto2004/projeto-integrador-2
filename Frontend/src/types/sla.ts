export type SlaGrupo = {
  id: string;
  nome: string;
  total: number;
  medidos: number;
  media_min: number | null;
  meta_min?: number | null;
};

export type SlaResumo = {
  media_min: number | null;
  total_encerrados: number;
  total_medidos: number;
  sem_medicao: number;
  por_medico: SlaGrupo[];
  por_servico: SlaGrupo[];
};

export type AtendimentoSla = {
  id: string;
  identificador: string;
  cidadao_nome: string;
  profissional_id: string | null;
  profissional_nome: string | null;
  servico_id: string;
  servico_nome: string;
  unidade_nome: string;
  situacao: string;
  situacao_nome: string;
  origem: string | null;
  data: string;
  horario: string;
  created_at: string;
  meta_min: number;
  medicao: {
    inicio: string | null;
    fim: string | null;
    duracao_min: number | null;
    historico: boolean;
    motivo: string | null;
    dentro_meta: boolean | null;
    agendado_em: string;
  };
};

export type AtendimentosSlaResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: AtendimentoSla[];
};
