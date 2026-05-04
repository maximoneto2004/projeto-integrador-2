import type { CriarEscalaPayload, DiaSemana } from "@/types/escalas";

type EscalaForm = {
  dias: string[];
  turno1?: {
    inicio?: string;
    fim?: string;
  };
  turno2?: {
    inicio?: string;
    fim?: string;
  };
};

const DIA_MAP: Record<string, DiaSemana> = {
  Domingo: "DOM",
  "Segunda-feira": "SEG",
  "Terça-feira": "TER",
  "Quarta-feira": "QUA",
  "Quinta-feira": "QUI",
  "Sexta-feira": "SEX",
  Sabado: "SAB",
};

function normalizeDiaLabel(dia: string): string {
  return dia.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeTimeValue(value?: string): string | null {
  const normalized = String(value ?? "").trim();
  if (!normalized || normalized === "0") {
    return null;
  }
  return normalized;
}

export function mapEscalaToAPI(escala: EscalaForm, profissionalId: string): CriarEscalaPayload {
  return {
    profissional: profissionalId,
    dias_semana: escala.dias
      .map((dia) => DIA_MAP[dia] ?? DIA_MAP[normalizeDiaLabel(dia)])
      .filter((dia): dia is DiaSemana => Boolean(dia)),
    turno1_inicio: normalizeTimeValue(escala.turno1?.inicio),
    turno1_fim: normalizeTimeValue(escala.turno1?.fim),
    turno2_inicio: normalizeTimeValue(escala.turno2?.inicio),
    turno2_fim: normalizeTimeValue(escala.turno2?.fim),
  };
}
