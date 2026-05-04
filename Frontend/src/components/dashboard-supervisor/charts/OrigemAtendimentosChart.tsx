// src/components/dashboard-supervisor/charts/OrigemAtendimentosChart.tsx

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

const TooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-sm">
      {label ? <div className="font-medium">{label}</div> : null}
      {payload.map((item: any) => (
        <div key={item.name || item.dataKey} className="text-muted-foreground">
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  );
};

interface OrigemAtendimentosChartProps {
  data: { origem: string; total: number }[];
}

export function OrigemAtendimentosChart({ data }: OrigemAtendimentosChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={24}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="origem" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} />

        <Legend />
        <Tooltip content={<TooltipContent />} />

        <Bar dataKey="total" name="Atendimentos" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
