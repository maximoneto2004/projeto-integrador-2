import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumoStatusChart } from "@/components/dashboard-supervisor/charts/ResumoStatusChart";

type ResumoStatusItem = {
  label: string;
  total: number;
};

type ResumoStatusSectionProps = {
  data: ResumoStatusItem[];
};

export function ResumoStatusSection({ data }: ResumoStatusSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Reagendados, cancelados e comparecimento</CardTitle>
        <CardDescription>Resumo de status-chave</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResumoStatusChart data={data} />
      </CardContent>
    </Card>
  );
}
