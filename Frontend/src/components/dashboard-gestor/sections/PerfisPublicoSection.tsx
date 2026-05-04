import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PerfisPublicoChart } from "@/components/dashboard-gestor/charts/PerfisPublicoChart";

type PerfilPublicoItem = {
  nome: string;
  valor: number;
};

type PerfisPublicoSectionProps = {
  data: PerfilPublicoItem[];
  colors: string[];
  tooltip: ReactNode;
};

export function PerfisPublicoSection({ data, colors, tooltip }: PerfisPublicoSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfis de público</CardTitle>
        <CardDescription>Participação por prioridade</CardDescription>
      </CardHeader>

      <CardContent className="h-80">
        {data.length ? (
          <PerfisPublicoChart data={data} colors={colors} tooltip={tooltip} />
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Sem dados no período.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
