import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OrigemAtendimentosChart } from "@/components/dashboard-supervisor/charts/OrigemAtendimentosChart";

type OrigemItem = {
  origem: string;
  total: number;
};

type OrigemAtendimentosSectionProps = {
  data: OrigemItem[];
};

export function OrigemAtendimentosSection({ data }: OrigemAtendimentosSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Origem dos agendamentos</CardTitle>
        <CardDescription>Recepção, site ou fila de espera</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <OrigemAtendimentosChart data={data} />
      </CardContent>
    </Card>
  );
}
