import { forwardRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface RadioProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
  hint?: ReactNode;
}

/**
 * Radio option with an associated visible label. Group radios by sharing the
 * same `name`; wrap the group in a `<fieldset>` with a `<legend>` for an
 * accessible group label (spec §23).
 */
export const Radio = forwardRef<HTMLInputElement, RadioProps>(function Radio(
  { label, hint, className, id, ...props },
  ref,
) {
  return (
    <label className={cn("flex items-start gap-2.5", className)} htmlFor={id}>
      <input
        ref={ref}
        id={id}
        type="radio"
        className="mt-0.5 h-4 w-4 shrink-0 border-border-strong text-brand-primary accent-[var(--brand-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
        {...props}
      />
      <span className="min-w-0">
        <span className="type-body-sm block text-text-primary">{label}</span>
        {hint ? <span className="type-caption block">{hint}</span> : null}
      </span>
    </label>
  );
});
