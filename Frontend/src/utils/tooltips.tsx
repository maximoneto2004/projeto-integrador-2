import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type HoverTextProps = {
  text?: unknown;
  cellClassName?: string;
  tooltipClassName?: string;
};

export function HoverText({ text, cellClassName = "", tooltipClassName = "" }: HoverTextProps) {
  const normalizedText = typeof text === "string" ? text : text == null ? "" : String(text);
  const value = normalizedText.trim() || "-";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("block min-w-0 w-full truncate", cellClassName)}>{value}</div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="start"
        className={cn(
          "max-w-[320px] rounded-lg border-slate-200 bg-white px-3 py-2 text-xs leading-relaxed text-slate-700 shadow-lg",
          tooltipClassName,
        )}
      >
        {value}
      </TooltipContent>
    </Tooltip>
  );
}
