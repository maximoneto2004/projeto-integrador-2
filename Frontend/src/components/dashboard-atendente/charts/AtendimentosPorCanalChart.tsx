// src/components/dashboard-atendente/charts/AtendimentosPorCanalChart.tsx

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

export function AtendimentosPorCanalChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="canal" tick={{ fontSize: 12 }} />
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
          fill="#0ea5e9"
          radius={[4, 4, 0, 0]}
        />

        <Line
          type="monotone"
          dataKey="tma"
          name="TMA (min)"
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
