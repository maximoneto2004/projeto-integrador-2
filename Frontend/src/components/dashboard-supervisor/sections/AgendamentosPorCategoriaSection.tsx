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
import { CategoriaChart } from "@/components/dashboard-supervisor/charts/CategoriaChart";

type CategoriaItem = {
  categoria: string;
  total: number;
};

type AgendamentosPorCategoriaSectionProps = {
  data: CategoriaItem[];
  subtitle: string;
};

export function AgendamentosPorCategoriaSection({
  data,
  subtitle,
}: AgendamentosPorCategoriaSectionProps) {
  const resumoData = data.slice(0, 3);
  const expandedMinWidth = Math.max(900, data.length * 95);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Agendamentos por categoria</CardTitle>
          <CardDescription>Período selecionado (top 3)</CardDescription>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              Expandir
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[96vw] w-[1400px] max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Agendamentos por categoria (todas)</DialogTitle>
              <DialogDescription>
                Visualização expandida com {data.length} categorias no período selecionado.
              </DialogDescription>
            </DialogHeader>
            <div className="w-full overflow-auto border rounded-md p-2">
              <div style={{ minWidth: expandedMinWidth, height: 720 }}>
                <CategoriaChart data={data} innerRadius={140} outerRadius={250} />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent className="h-80">
        {resumoData.length ? (
          <CategoriaChart data={resumoData} innerRadius={55} outerRadius={95} />
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum dado no período.</p>
        )}
      </CardContent>
    </Card>
  );
}
