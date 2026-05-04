// src/components/dashboard-supervisor/charts/CategoriaChart.tsx

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

const TooltipContent = ({ active, payload }: any) => {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="rounded-md border bg-card px-3 py-2 text-xs shadow-sm">
      {payload.map((item: any) => (
        <div key={item.name || item.dataKey} className="text-muted-foreground">
          {item.name}: {item.value}
        </div>
      ))}
    </div>
  );
};

interface CategoriaChartProps {
  data: { categoria: string; total: number }[];
  innerRadius?: number;
  outerRadius?: number;
  showLegend?: boolean;
}

export function CategoriaChart({
  data,
  innerRadius = 50,
  outerRadius = 80,
  showLegend = true,
}: CategoriaChartProps) {
  const colors = [
    "#2563eb",
    "#0ea5e9",
    "#22c55e",
    "#f97316",
    "#ef4444",
    "#6366f1",
  ];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="categoria"
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          paddingAngle={3}
        >
          {data.map((_, index) => (
            <Cell
              key={index}
              fill={colors[index % colors.length]}
            />
          ))}
        </Pie>

        {showLegend ? <Legend /> : null}
        <Tooltip content={<TooltipContent />} />
      </PieChart>
    </ResponsiveContainer>
  );
}
