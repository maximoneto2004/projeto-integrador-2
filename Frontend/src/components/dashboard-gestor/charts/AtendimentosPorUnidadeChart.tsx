// src/components/dashboard-gestor/charts/AtendimentosPorUnidadeChart.tsx

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

export function AtendimentosPorUnidadeChart({ data, tooltip }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="nome" />
        <YAxis />
        <Tooltip content={tooltip} />
        <Legend />

        <Bar
          dataKey="atendimentosHoje"
          name="Atendimentos"
          fill="hsl(var(--primary))"
          radius={[4, 4, 0, 0]}
        />

        <Bar
          dataKey="fila"
          name="Fila"
          fill="hsl(var(--muted-foreground))"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
