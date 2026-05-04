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
import { AtendimentosPorUnidadeChart } from "@/components/dashboard-gestor/charts/AtendimentosPorUnidadeChart";
import { AtendimentosPorUnidadeHorizontalChart } from "@/components/dashboard-gestor/charts/AtendimentosPorUnidadeHorizontalChart";

type UnidadeBase = {
  nome: string;
  atendimentosHoje: number;
  fila: number;
};

type AtendimentosPorUnidadeSectionProps = {
  data: UnidadeBase[];
  loading: boolean;
  hasDashboardData: boolean;
  tooltip: ReactNode;
};

export function AtendimentosPorUnidadeSection({
  data,
  loading,
  hasDashboardData,
  tooltip,
}: AtendimentosPorUnidadeSectionProps) {
  const resumoData = data.slice(0, 15);
  const possuiMaisUnidades = data.length > resumoData.length;

  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Atendimentos por unidade</CardTitle>
          <CardDescription>Distribuição de atendimentos no período selecionado (top 15)</CardDescription>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={!possuiMaisUnidades}>
              Expandir
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[96vw] w-[1400px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Atendimentos por unidade (todas)</DialogTitle>
              <DialogDescription>
                Visualização expandida com {data.length} unidades no período selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="w-full overflow-auto border rounded-md p-2">
              <AtendimentosPorUnidadeHorizontalChart data={data} tooltip={tooltip} />
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="h-80">
        {loading && !hasDashboardData ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            Carregando dados...
          </div>
        ) : (
          <AtendimentosPorUnidadeChart data={resumoData} tooltip={tooltip} />
        )}
      </CardContent>
    </Card>
  );
}
