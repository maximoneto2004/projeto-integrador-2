import type { ReactNode } from "react";

type TooltipPayloadItem = {
  dataKey?: string;
  fill?: string;
  stroke?: string;
  color?: string;
  name?: string;
  value?: string | number;
};

type DashboardGestorTooltipProps = {
  label?: string;
  payload?: TooltipPayloadItem[];
};

export function DashboardGestorTooltip({ label, payload }: DashboardGestorTooltipProps) {
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
      {label && <div className="font-medium">{label}</div>}
      {payload?.map((item) => (
        <div key={item.dataKey || item.name} className="flex items-center gap-2">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: item.fill || item.stroke || item.color || "hsl(var(--primary))" }}
          />
          <span className="text-muted-foreground">
            {item.name}: {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
