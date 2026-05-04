import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChart } from "@/components/dashboard-supervisor/charts/StatusChart";

type VolumeStatusItem = {
  status: string;
  total: number;
  fill: string;
};

type VolumeStatusSectionProps = {
  data: VolumeStatusItem[];
};

export function VolumeStatusSection({ data }: VolumeStatusSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Volume e status</CardTitle>
        <CardDescription>Distribuição por status no período</CardDescription>
      </CardHeader>
      <CardContent className="h-80">
        <StatusChart data={data} />
      </CardContent>
    </Card>
  );
}
