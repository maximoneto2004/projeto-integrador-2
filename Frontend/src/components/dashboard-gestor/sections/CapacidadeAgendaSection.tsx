import type { ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CapacidadeOcupacaoChart } from "@/components/dashboard-gestor/charts/CapacidadeOcupacaoChart";
import { CapacidadeOcupacaoHorizontalChart } from "@/components/dashboard-gestor/charts/CapacidadeOcupacaoHorizontalChart";

type CapacidadeItem = {
  nome: string;
  capacidade: number;
  ocupacao: number;
};

type CapacidadeAgendaSectionProps = {
  data: CapacidadeItem[];
  tooltip: ReactNode;
};

export function CapacidadeAgendaSection({ data, tooltip }: CapacidadeAgendaSectionProps) {
  const resumoData = data.slice(0, 15);
  const possuiMaisUnidades = data.length > resumoData.length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Agenda e capacidade</CardTitle>
          <CardDescription>Capacidade prevista x ocupação realizada (top 15)</CardDescription>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!possuiMaisUnidades}>
              Expandir
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[96vw] w-[1400px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Agenda e capacidade (todas)</DialogTitle>
              <DialogDescription>
                Visualização expandida com {data.length} unidades no período selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="w-full overflow-auto border rounded-md p-2">
              <CapacidadeOcupacaoHorizontalChart data={data} tooltip={tooltip} />
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="h-72">
        <CapacidadeOcupacaoChart data={resumoData} tooltip={tooltip} />
      </CardContent>
    </Card>
  );
}
