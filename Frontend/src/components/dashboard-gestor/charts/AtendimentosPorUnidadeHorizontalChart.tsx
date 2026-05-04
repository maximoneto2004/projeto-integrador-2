import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

type UnidadeItem = {
  nome: string;
  atendimentosHoje: number;
  fila: number;
};

type AtendimentosPorUnidadeHorizontalChartProps = {
  data: UnidadeItem[];
  tooltip: ReactNode;
};

export function AtendimentosPorUnidadeHorizontalChart({
  data,
  tooltip,
}: AtendimentosPorUnidadeHorizontalChartProps) {
  const chartHeight = Math.max(460, data.length * 30);

  return (
    <div className="w-full min-w-[980px]" style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 20, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis type="number" />
          <YAxis dataKey="nome" type="category" width={220} tick={{ fontSize: 12 }} />
          <Tooltip content={tooltip} />
          <Legend />

          <Bar
            dataKey="atendimentosHoje"
            name="Atendimentos"
            fill="hsl(var(--primary))"
            radius={[0, 4, 4, 0]}
          />

          <Bar dataKey="fila" name="Fila" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
