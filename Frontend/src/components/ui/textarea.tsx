import * as React from "react";

import { sanitizeTextInputValue } from "@/lib/textSanitizer";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  sanitizeText?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({ className, onChange, sanitizeText = true, ...props }, ref) => {
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (sanitizeText) {
      const sanitizedValue = sanitizeTextInputValue(event.currentTarget.value);
      if (sanitizedValue !== event.currentTarget.value) {
        event.currentTarget.value = sanitizedValue;
      }
    }
    onChange?.(event);
  };

  return (
    <textarea
      className={cn(
        "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      ref={ref}
      onChange={handleChange}
      {...props}
    />
  );
});
Textarea.displayName = "Textarea";

export { Textarea };
