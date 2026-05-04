// src/components/dashboard-atendente/charts/VolumeTurnoChart.tsx

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

export function VolumeTurnoChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />

        <XAxis dataKey="turno" />
        <YAxis yAxisId="left" allowDecimals={false} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v) => `${v}m`}
        />

        <Tooltip />
        <Legend />

        <Bar
          yAxisId="left"
          dataKey="atendimentos"
          name="Atendimentos"
          fill="#2563eb"
          radius={[4, 4, 0, 0]}
        />

        <Bar
          yAxisId="left"
          dataKey="filaMedia"
          name="Fila média"
          fill="#94a3b8"
          radius={[4, 4, 0, 0]}
        />

        <Line
          yAxisId="right"
          type="monotone"
          dataKey="tempoFila"
          name="Tempo de fila (min)"
          stroke="#f97316"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
