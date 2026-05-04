export type DiaSemana = "DOM" | "SEG" | "TER" | "QUA" | "QUI" | "SEX" | "SAB";

export type CriarEscalaPayload = {
  profissional: string;

  dias_semana: DiaSemana[];
  turno1_inicio?: string | null;
  turno1_fim?: string | null;
  turno2_inicio?: string | null;
  turno2_fim?: string | null;
};

export type EscalaApi = {
  id: string;
  dias_semana: DiaSemana[];
  turno1_inicio: string | null;
  turno1_fim: string | null;
  turno2_inicio: string | null;
  turno2_fim: string | null;
  usuario?: {
    id: string;
    nome_completo: string;
    guiche_atual?: {
      id: string;
      nome: string;
    } | null;
  };
  unidade?: {
    id: string;
    nome: string;
  };
};

export type ApiResponse<T> = {
  success: boolean;
  data: T;
};
