import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, maxLength, ...props }, ref) => {
    // Default maxLength to 100 for text-like inputs unless explicitly overridden
    const effectiveMaxLength = maxLength ?? (
      type === "number" || type === "date" || type === "datetime-local" || type === "time" || type === "color" || type === "file" || type === "checkbox" || type === "radio" || type === "hidden" || type === "range"
        ? undefined
        : 100
    );

    return (
      <input
        type={type}
        maxLength={effectiveMaxLength}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
