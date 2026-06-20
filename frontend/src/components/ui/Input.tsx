import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

const fieldBase =
  "block w-full rounded-md border bg-surface-canvas px-3 text-text-primary " +
  "placeholder:text-text-muted transition-colors duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring " +
  "disabled:cursor-not-allowed disabled:bg-surface-subtle disabled:opacity-70";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

/**
 * Text input primitive. `invalid` sets `aria-invalid` and an error border so
 * the state is conveyed beyond colour alone (spec §13.7, §23). {@link Field}
 * passes `invalid` and the `aria-describedby` wiring automatically.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { invalid, className, ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        fieldBase,
        "h-11",
        invalid ? "border-status-danger" : "border-border-strong",
        className,
      )}
      {...props}
    />
  );
});

export { fieldBase };
