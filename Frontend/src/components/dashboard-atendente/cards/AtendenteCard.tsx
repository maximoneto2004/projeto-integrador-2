// src/components/dashboard-atendente/cards/AtendenteCard.tsx

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface AtendenteCardProps {
  title: string;
  value: string | number;
  helper?: string;
  icon: any;
  accent?: string;
}

export function AtendenteCard({
  title,
  value,
  helper,
  icon: Icon,
  accent = "bg-primary/10 text-primary",
}: AtendenteCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

        <span className={`rounded-full p-2 ${accent}`}>
          <Icon className="h-4 w-4" />
        </span>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {helper && (
          <p className="text-sm text-muted-foreground">{helper}</p>
        )}
      </CardContent>
    </Card>
  );
}
