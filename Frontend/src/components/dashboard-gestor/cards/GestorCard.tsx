// src/components/dashboard-gestor/cards/GestorCard.tsx

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";

interface GestorCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: any;
  accent?: string;
}

export function GestorCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "text-primary",
}: GestorCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 ${accent}`} />
      </CardHeader>

      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}
