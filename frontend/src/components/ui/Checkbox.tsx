import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Visible label rendered beside the control. */
  label: ReactNode;
  hint?: ReactNode;
}

/**
 * Checkbox with an associated visible label. The native control stays in the
 * DOM (keyboard + screen-reader friendly); the label wraps it so the whole row
 * is clickable.
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox({ label, hint, className, id, ...props }, ref) {
    return (
      <label
        className={cn("flex items-start gap-2.5", className)}
        htmlFor={id}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded-sm border-border-strong text-brand-primary accent-[var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          {...props}
        />
        <span className="min-w-0">
          <span className="type-body-sm block text-text-primary">{label}</span>
          {hint ? (
            <span className="type-caption block">{hint}</span>
          ) : null}
        </span>
      </label>
    );
  },
);
