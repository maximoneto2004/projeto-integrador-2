import { Activity, Ban, ListChecks, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MonitorUnidadeCardsGridProps = {
  totalAgendamentos: number;
  ativados: number;
  comparecimento: number;
  noShowRate: number;
};

export function MonitorUnidadeCardsGrid({ totalAgendamentos, ativados, comparecimento, noShowRate }: MonitorUnidadeCardsGridProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Atendimentos hoje</CardTitle>
          <Users className="h-5 w-5 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{totalAgendamentos}</div>
          <p className="text-sm text-muted-foreground">Registrados no dia</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Fila de Encaixe </CardTitle>
          <ListChecks className="h-5 w-5 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{ativados}</div>
          <p className="text-sm text-muted-foreground">Aguardando atendimento</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Comparecimento</CardTitle>
          <Activity className="h-5 w-5 text-emerald-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{comparecimento}%</div>
          <p className="text-sm text-muted-foreground">Presença no período</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Não compareceu</CardTitle>
          <Ban className="h-5 w-5 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{noShowRate}%</div>
          <p className="text-sm text-muted-foreground">Taxa de ausência</p>
        </CardContent>
      </Card>
    </div>
  );
}
