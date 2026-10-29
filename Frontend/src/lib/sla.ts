const minutos = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "medium",
});

export function formatSla(value: number | null | undefined): string {
  return value == null ? "Sem medição" : `${minutos.format(value)} min`;
}

// Todos os marcos usam o fuso da unidade, inclusive em navegadores de outras regiões.
export function formatSlaDate(value: string | null | undefined): string {
  return value ? dataHora.format(new Date(value)) : "Não registrado";
}
