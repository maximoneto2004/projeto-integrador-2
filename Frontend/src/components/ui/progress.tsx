import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

import { cn } from "@/lib/utils";

const PROGRESS_TRANSLATE_CLASSES = [
  "-translate-x-[100%]",
  "-translate-x-[95%]",
  "-translate-x-[90%]",
  "-translate-x-[85%]",
  "-translate-x-[80%]",
  "-translate-x-[75%]",
  "-translate-x-[70%]",
  "-translate-x-[65%]",
  "-translate-x-[60%]",
  "-translate-x-[55%]",
  "-translate-x-[50%]",
  "-translate-x-[45%]",
  "-translate-x-[40%]",
  "-translate-x-[35%]",
  "-translate-x-[30%]",
  "-translate-x-[25%]",
  "-translate-x-[20%]",
  "-translate-x-[15%]",
  "-translate-x-[10%]",
  "-translate-x-[5%]",
  "translate-x-0",
];

const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root>
>(({ className, value, ...props }, ref) => {
  const safeValue = Math.min(100, Math.max(0, value || 0));
  const stepped = Math.round(safeValue / 5) * 5;
  const remaining = 100 - stepped;
  const index = Math.min(PROGRESS_TRANSLATE_CLASSES.length - 1, Math.max(0, remaining / 5));

  return (
    <ProgressPrimitive.Root
      ref={ref}
      className={cn("relative h-4 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 bg-primary transition-transform", PROGRESS_TRANSLATE_CLASSES[index])}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
