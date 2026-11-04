import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DashboardGestorResult } from "@/services/sistema/dashboardGestorService";
import { SERIES } from "@/lib/coresGraficos";

// Dois primeiros tons da paleta categórica validada.
const COR_VAGAS = SERIES[0];
const COR_AGENDAMENTOS = SERIES[1];
// Altura por tipo de serviço no modo completo, para as barras não se espremerem quando há muitos serviços.
const ALTURA_POR_SERVICO = 56;

type Dados = DashboardGestorResult["demanda_capacidade"];

// Os serviços com mais agendamentos primeiro: são os que mais pesam na agenda.
const ordenarDemandaCapacidade = (dados: Dados) =>
  [...dados].sort((a, b) => b.agendamentos - a.agendamentos || b.vagas - a.vagas);

export function DemandaCapacidadeChart({ dados, limite, alturaAutomatica }: { dados: Dados; limite?: number; alturaAutomatica?: boolean }) {
  if (!dados.length) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Nenhuma vaga ou agendamento no período.</p>;
  }
  const exibidos = ordenarDemandaCapacidade(dados).slice(0, limite);
  return (
    <div className="h-full w-full" style={alturaAutomatica ? { height: Math.max(240, exibidos.length * ALTURA_POR_SERVICO + 60) } : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={exibidos} layout="vertical" margin={{ top: 8, right: 16, bottom: 0, left: 8 }} barGap={2} barCategoryGap="25%">
          <CartesianGrid horizontal={false} strokeOpacity={0.4} />
          <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
          <YAxis type="category" dataKey="tipo_servico" width={170} tick={{ fontSize: 12 }} tickLine={false} />
          <Tooltip formatter={(valor: number, nome: string) => [valor.toLocaleString("pt-BR"), nome]} />
          <Legend verticalAlign="top" height={28} />
          <Bar dataKey="vagas" name="Vagas abertas" fill={COR_VAGAS} radius={[0, 4, 4, 0]} />
          <Bar dataKey="agendamentos" name="Agendamentos" fill={COR_AGENDAMENTOS} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
