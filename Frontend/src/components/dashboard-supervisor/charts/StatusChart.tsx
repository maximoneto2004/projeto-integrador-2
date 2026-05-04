import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Cell,
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

interface StatusChartProps {
  data: { status: string; total: number; fill: string }[];
}

export function StatusChart({ data }: StatusChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} barSize={20}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="status" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} />
        <RechartsTooltip content={<TooltipContent />} />

        <Bar dataKey="total" radius={[4, 4, 0, 0]}>
          {data.map((item) => (
            <Cell key={item.status} fill={item.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
