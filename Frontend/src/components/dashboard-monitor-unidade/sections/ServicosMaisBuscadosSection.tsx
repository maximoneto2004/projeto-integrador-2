import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type ServicoBuscadoItem = {
  servico: string;
  total: number;
};

type ServicosMaisBuscadosSectionProps = {
  data: ServicoBuscadoItem[];
};

export function ServicosMaisBuscadosSection({ data }: ServicosMaisBuscadosSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Serviços mais buscados</CardTitle>
        <CardDescription>Top 5 no período</CardDescription>
      </CardHeader>
      <CardContent className="h-72 overflow-y-auto">
        <div className="space-y-3">
          {data.map((item) => (
            <div key={item.servico} className="flex items-center justify-between rounded-md border bg-card p-3">
              <div>
                <div className="font-medium">{item.servico}</div>
                <p className="text-sm text-muted-foreground">Demandas registradas</p>
              </div>
              <Badge variant="secondary">{item.total}</Badge>
            </div>
          ))}
          {data.length === 0 && <p className="text-sm text-muted-foreground">Sem serviços registrados.</p>}
        </div>
      </CardContent>
    </Card>
  );
}
