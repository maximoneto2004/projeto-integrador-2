// Cores dos gráficos. Os valores ficam em index.css (--grafico-1..8), com versões próprias para o tema escuro.

// Paleta categórica: identidade de série, sempre atribuída nesta ordem e nunca reciclada.
// Uma série única usa SERIES[0]; da 9ª categoria em diante, agrupe em "Outros" (COR_OUTROS).
export const SERIES = Array.from({ length: 8 }, (_, i) => `hsl(var(--grafico-${i + 1}))`);

export const COR_OUTROS = "hsl(var(--muted-foreground))";

// Linhas de grade e textos dos eixos seguem os tokens de interface, não a cor da série.
export const COR_GRADE = "hsl(var(--border))";
export const COR_EIXO = "hsl(var(--muted-foreground))";

// Rampa sequencial de um tom (laranja da marca), do claro = pouca demanda ao escuro = muita.
// Em hex porque o mapa de calor desenha em canvas, onde variáveis CSS não funcionam.
export const RAMPA_CALOR = ["#fbdccb", "#f4a27a", "#e2672a", "#c2521b", "#7a3210"];
export const GRADIENTE_CALOR = `linear-gradient(to right, ${RAMPA_CALOR.join(", ")})`;
