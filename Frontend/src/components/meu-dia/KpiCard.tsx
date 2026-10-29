import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type KpiCardProps = {
  title: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  alerta?: boolean;
};

export function KpiCard({ title, value, helper, icon: Icon, alerta = false }: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <span className={cn("rounded-full p-2", alerta ? "bg-red-100 text-red-700" : "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        <p className={cn("mt-1 text-sm", alerta ? "text-red-700" : "text-muted-foreground")}>{helper}</p>
      </CardContent>
    </Card>
  );
}
