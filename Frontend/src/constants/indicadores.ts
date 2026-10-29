// Metas dos indicadores (docs/analise_dashboards_por_perfil.md, seção 5.1).
export const META_ABSENTEISMO_MAX_PCT = 15;
export const META_DENTRO_PRAZO_MIN_PCT = 80;
export const META_OCUPACAO_MAX_PCT = 90;
export const META_FILA_MAX = 20;

export const ORIGEM_LABELS: Record<string, string> = {
  RECEPCAO: "Recepção",
  SITE: "Site",
  FILA: "Fila de espera",
  "156": "Central 156 (legado)",
};

export const origemLabel = (origem?: string | null) => (origem ? ORIGEM_LABELS[origem] || origem : "Não informado");
