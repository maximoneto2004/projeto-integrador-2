export type Avaliacao = {
  id: string;
  agendamento: string;
  nota: number;
  comentario?: string;
  is_active: boolean;
  created_at?: string;
};

export type AvaliacaoPayload = {
  agendamento: string;
  nota: number;
  comentario?: string;
};
