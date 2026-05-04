import type { ReactNode } from "react";
import {
  ResponsiveContainer,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
} from "recharts";

type CapacidadeItem = {
  nome: string;
  capacidade: number;
  ocupacao: number;
};

type CapacidadeOcupacaoHorizontalChartProps = {
  data: CapacidadeItem[];
  tooltip: ReactNode;
};

export function CapacidadeOcupacaoHorizontalChart({
  data,
  tooltip,
}: CapacidadeOcupacaoHorizontalChartProps) {
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

          <Bar dataKey="capacidade" name="Capacidade" fill="#94a3b8" radius={[0, 4, 4, 0]} />
          <Bar dataKey="ocupacao" name="Ocupação" fill="#2563eb" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
