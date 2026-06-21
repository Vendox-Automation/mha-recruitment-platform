import type { LabelHTMLAttributes } from "react";

import { cn } from "@/lib/cn";

import { VisuallyHidden } from "./VisuallyHidden";

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  /** Renders a required indicator with accessible text. */
  required?: boolean;
  requiredLabel?: string;
}

/**
 * Form label primitive (spec §23 "proper labels"). Always associate with a
 * control via `htmlFor`; {@link Field} wires this up automatically.
 */
export function Label({
  required,
  requiredLabel = "required",
  className,
  children,
  ...props
}: LabelProps) {
  return (
    <label
      className={cn(
        "type-label block text-text-primary",
        className,
      )}
      {...props}
    >
      {children}
      {required ? (
        <span className="ml-1 text-status-danger" aria-hidden="true">
          *
        </span>
      ) : null}
      {required ? <VisuallyHidden> ({requiredLabel})</VisuallyHidden> : null}
    </label>
  );
}
