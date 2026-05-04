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
        <CardTitle>Origem dos atendimentos</CardTitle>
        <CardDescription>Demanda espontânea, portal, SPU ou CRAS</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <OrigemAtendimentosChart data={data} />
      </CardContent>
    </Card>
  );
}
