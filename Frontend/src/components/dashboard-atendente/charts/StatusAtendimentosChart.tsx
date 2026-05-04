// src/components/dashboard-atendente/charts/StatusAtendimentosChart.tsx

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

export function StatusAtendimentosChart({
  data,
  colors,
}: {
  data: any[];
  colors: string[];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="status"
          outerRadius={110}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
        >
          {data.map((_, idx) => (
            <Cell key={idx} fill={colors[idx % colors.length]} />
          ))}
        </Pie>

        <Tooltip formatter={(value: any, name: string) => [value, name]} />

        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
