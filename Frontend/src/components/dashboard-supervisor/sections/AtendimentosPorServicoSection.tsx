import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AtendentesChart } from "@/components/dashboard-supervisor/charts/AtendentesChart";

type AtendimentosPorServicoItem = {
  atendente: string;
  total: number;
  tempoMedioColaborador: number;
};

type AtendimentosPorServicoSectionProps = {
  data: AtendimentosPorServicoItem[];
};

export function AtendimentosPorServicoSection({ data }: AtendimentosPorServicoSectionProps) {
  const resumoData = data.slice(0, 12);
  const expandedMinWidth = Math.max(900, data.length * 120);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Atendimentos por serviço</CardTitle>
          <CardDescription>Volume e tempo médio por serviço (top 12)</CardDescription>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Expandir
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[96vw] w-[1400px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Atendimentos por serviço (todos)</DialogTitle>
              <DialogDescription>
                Visualização expandida com {data.length} unidades no período selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="w-full overflow-auto border rounded-md p-2">
              <div style={{ minWidth: expandedMinWidth, height: 520 }}>
                <AtendentesChart data={data} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="h-80">
        {resumoData.length ? (
          <AtendentesChart data={resumoData} />
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum dado no período.</p>
        )}
      </CardContent>
    </Card>
  );
}
