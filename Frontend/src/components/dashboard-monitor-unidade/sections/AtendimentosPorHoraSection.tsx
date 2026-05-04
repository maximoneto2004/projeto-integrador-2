import type { ReactNode } from "react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AtendimentosPorHoraItem = {
  hora: string;
  total: number;
};

type AtendimentosPorHoraSectionProps = {
  data: AtendimentosPorHoraItem[];
  tooltip: ReactNode;
};

export function AtendimentosPorHoraSection({ data, tooltip }: AtendimentosPorHoraSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Atendimentos por hora</CardTitle>
        <CardDescription>Volume por faixa horária</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="hora" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip content={tooltip} />
            <Legend />
            <Line type="monotone" dataKey="total" name="Atendimentos" stroke="hsl(var(--primary))" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
