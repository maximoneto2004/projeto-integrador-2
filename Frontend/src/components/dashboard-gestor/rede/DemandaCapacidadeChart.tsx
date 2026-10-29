import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardGestorResult } from "@/services/sistema/dashboardGestorService";

// Dois primeiros tons da paleta categórica validada.
const COR_VAGAS = "#2a78d6";
const COR_AGENDAMENTOS = "#eb6834";

export function DemandaCapacidadeChart({ dados }: { dados: DashboardGestorResult["demanda_capacidade"] }) {
  if (!dados.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma vaga ou agendamento no período.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={dados} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }} barGap={2} barCategoryGap="25%">
        <CartesianGrid horizontal={false} strokeOpacity={0.4} />
        <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
        <YAxis type="category" dataKey="tipo_servico" width={170} tick={{ fontSize: 12 }} tickLine={false} />
        <Tooltip formatter={(valor: number, nome: string) => [valor.toLocaleString("pt-BR"), nome]} />
        <Legend verticalAlign="top" height={28} />
        <Bar dataKey="vagas" name="Vagas abertas" fill={COR_VAGAS} radius={[0, 4, 4, 0]} />
        <Bar dataKey="agendamentos" name="Agendamentos" fill={COR_AGENDAMENTOS} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
