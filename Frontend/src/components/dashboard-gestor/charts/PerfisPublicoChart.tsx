// src/components/dashboard-gestor/charts/PerfisPublicoChart.tsx

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export function PerfisPublicoChart({ data, colors, tooltip }: any) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="valor"
          nameKey="nome"
          outerRadius={100}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
        >
          {data.map((_: any, index: number) => (
            <Cell key={index} fill={colors[index % colors.length]} />
          ))}
        </Pie>

        <Tooltip content={tooltip} />
      </PieChart>
    </ResponsiveContainer>
  );
}
