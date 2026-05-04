// src/components/dashboard-supervisor/DashboardCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: any;
  accent?: string; // classes extras (bg, text, etc.)
}

export default function DashboardCard({
  title,
  value,
  icon: Icon,
  accent = "bg-primary/10 text-primary",
}: DashboardCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>

        <span className={`p-2 rounded-full ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}
