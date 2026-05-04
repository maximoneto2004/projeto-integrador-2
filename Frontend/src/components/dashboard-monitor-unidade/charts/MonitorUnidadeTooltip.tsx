import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import type { TooltipProps } from "recharts";

export function MonitorUnidadeTooltip({ label, payload }: TooltipProps<ValueType, NameType>) {
  return (
    <div className="rounded-md border bg-card px-3 py-2 text-sm shadow-sm">
      {label && <div className="font-medium">{label}</div>}
      {payload?.map((item) => (
        <div key={String(item.dataKey ?? item.name ?? "")} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          <span className="text-muted-foreground">
            {item.name}: {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
