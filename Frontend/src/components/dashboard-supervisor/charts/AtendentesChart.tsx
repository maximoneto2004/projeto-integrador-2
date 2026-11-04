// src/components/dashboard-supervisor/charts/AtendentesChart.tsx

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
} from "recharts";
import { SERIES } from "@/lib/coresGraficos";

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

interface AtendentesChartProps {
  data: {
    atendente: string;
    total: number;
    tempoMedioColaborador: number | null;
  }[];
}

export function AtendentesChart({ data }: AtendentesChartProps) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="atendente" tick={{ fontSize: 12 }} />
        <YAxis yAxisId="left" allowDecimals={false} />
        <YAxis
          yAxisId="right"
          orientation="right"
          tickFormatter={(v) => `${Math.round(v)}m`}
        />
        <Tooltip content={<TooltipContent />} />
        <Legend />

        <Bar
          yAxisId="left"
          dataKey="total"
          name="Consultas"
          fill={SERIES[0]}
          radius={[4, 4, 0, 0]}
        />

        <Line
          yAxisId="right"
          type="monotone"
          dataKey="tempoMedioColaborador"
          name="Tempo médio (min)"
          stroke={SERIES[1]}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
