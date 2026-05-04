import type { ReactNode } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type FilaPorStatusItem = {
  status: string;
  total: number;
};

type FilaPorStatusSectionProps = {
  data: FilaPorStatusItem[];
  tooltip: ReactNode;
};

export function FilaPorStatusSection({ data, tooltip }: FilaPorStatusSectionProps) {
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>Fila por status</CardTitle>
        <CardDescription>Distribuição dos principais status</CardDescription>
      </CardHeader>
      <CardContent className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barCategoryGap="10%">
            <CartesianGrid strokeDasharray="4 4" stroke="hsl(var(--border))" />
            <XAxis dataKey="status" />
            <YAxis allowDecimals={false} />
            <RechartsTooltip content={tooltip} />
            <Legend />
            <Bar dataKey="total" name="Total" fill="hsl(var(--primary))" radius={[5, 5, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
