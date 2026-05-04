// src/components/dashboard-atendente/charts/AtendimentosPorServicoChart.tsx

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export function AtendimentosPorServicoChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={22}>
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="servico" tick={{ fontSize: 11 }} />
        <YAxis allowDecimals={false} />

        <Tooltip
          formatter={(value: any, name: string) =>
            name === "tma"
              ? [`${value} min`, "TMA"]
              : [value, "Atendimentos"]
          }
        />

        <Legend />

        <Bar
          dataKey="total"
          name="Atendimentos"
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
        />

        <Line
          type="monotone"
          dataKey="tma"
          name="TMA (min)"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
