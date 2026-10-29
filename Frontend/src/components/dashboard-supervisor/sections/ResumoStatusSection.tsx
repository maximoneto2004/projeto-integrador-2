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
        <CardTitle>Cancelados, ausências e atendidos</CardTitle>
        <CardDescription>Como terminaram os agendamentos do período</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <ResumoStatusChart data={data} />
      </CardContent>
    </Card>
  );
}
