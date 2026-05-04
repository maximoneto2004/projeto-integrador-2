// src/components/dashboard-gestor/charts/CapacidadeOcupacaoChart.tsx

import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
} from "recharts";

export function CapacidadeOcupacaoChart({ data, tooltip }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="nome" />
        <YAxis />
        <Tooltip content={tooltip} />
        <Legend />

        <Bar
          dataKey="capacidade"
          name="Capacidade"
          fill="#94a3b8"
          radius={[4, 4, 0, 0]}
        />

        <Bar
          dataKey="ocupacao"
          name="Ocupação"
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
        />

        <Line
          type="monotone"
          dataKey="ocupacao"
          name="Linha ocupação"
          stroke="#0ea5e9"
          strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
