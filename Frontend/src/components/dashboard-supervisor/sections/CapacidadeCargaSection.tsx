import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HorariosChart } from "@/components/dashboard-supervisor/charts/HorariosChart";

type HorarioItem = {
  hora: string;
  total: number;
};

type CapacidadeCargaSectionProps = {
  data: HorarioItem[];
  horarioPico: HorarioItem;
};

export function CapacidadeCargaSection({ data, horarioPico }: CapacidadeCargaSectionProps) {
  return (
    <Card>
      <CardHeader className="flex justify-between">
        <div>
          <CardTitle>Capacidade e carga</CardTitle>
          <CardDescription>Atendimentos por hora no período</CardDescription>
        </div>
        <Badge variant="secondary" className="gap-2">
          <Zap className="h-4 w-4" />
          Pico: {horarioPico.hora} ({horarioPico.total})
        </Badge>
      </CardHeader>
      <CardContent className="h-80">
        <HorariosChart data={data} />
      </CardContent>
    </Card>
  );
}
