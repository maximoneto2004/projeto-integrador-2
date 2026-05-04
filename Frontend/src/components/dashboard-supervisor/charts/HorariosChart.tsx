// src/components/dashboard-supervisor/charts/HorariosChart.tsx

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
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

interface HorariosChartProps {
  data: { hora: string; total: number }[];
}

export function HorariosChart({ data }: HorariosChartProps) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hora" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} />
        <Tooltip content={<TooltipContent />} />

        <Bar dataKey="total" fill="#f97316" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
