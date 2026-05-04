import * as React from "react";

import { sanitizeTextInputValue, shouldSanitizeInputType } from "@/lib/textSanitizer";
import { cn } from "@/lib/utils";

type InputProps = React.ComponentProps<"input"> & {
  sanitizeText?: boolean;
};

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, onChange, sanitizeText = true, type, ...props }, ref) => {
    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (sanitizeText && shouldSanitizeInputType(type)) {
        const sanitizedValue = sanitizeTextInputValue(event.currentTarget.value);
        if (sanitizedValue !== event.currentTarget.value) {
          event.currentTarget.value = sanitizedValue;
        }
      }
      onChange?.(event);
    };

    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        onChange={handleChange}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
