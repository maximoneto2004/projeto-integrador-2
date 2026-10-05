// Datas "YYYY-MM-DD" são interpretadas no fuso local para não voltar um dia em UTC-3.
export function formatarData(iso?: string | null, comHora = false) {
  if (!iso) return "-";
  const d = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return comHora ? d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : d.toLocaleDateString("pt-BR");
}

export function diasAte(iso: string) {
  const alvo = new Date(`${iso}T00:00:00`).getTime();
  const hoje = new Date(new Date().toLocaleDateString("en-CA") + "T00:00:00").getTime();
  return Math.round((alvo - hoje) / 86_400_000);
}
