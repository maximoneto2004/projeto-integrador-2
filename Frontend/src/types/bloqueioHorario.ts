export type BloqueioHorario = {
  id: string;
  unidade: string[];
  data: string;
  data_final: string | null;
  hora_inicio: string;
  hora_fim: string;
  motivo: string;
  criado_por: string;
  alterado_por?: string | null;
  justificativa_alteracao?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type CriarBloqueioHorarioPayload = {
  unidade: string[];
  criado_por: string;
  data: string;
  data_final: string | null;
  hora_inicio: string;
  hora_fim: string;
  motivo: string;
};

export type BloqueioHorarioPayload = {
  unidade?: string[];
  data?: string;
  data_final?: string;
  hora_inicio?: string;
  hora_fim?: string;
  motivo?: string;
  is_active?: boolean;
  justificativa_alteracao?: string | null;
  alterado_por?: string;
};
