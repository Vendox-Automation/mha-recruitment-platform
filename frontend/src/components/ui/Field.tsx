import { useId } from "react";
import type { ReactElement, ReactNode } from "react";
import { cloneElement, isValidElement } from "react";

import { cn } from "@/lib/cn";

import { Label } from "./Label";

export interface FieldProps {
  /** Visible field label text. */
  label: ReactNode;
  /** Whether the control is required (marks the label + control). */
  required?: boolean;
  /** Accessible text for the required marker (localised). */
  requiredLabel?: string;
  /** Optional helper text. Shown below the label by default. */
  hint?: ReactNode;
  /**
   * Where the hint renders relative to the control. "bottom" keeps the control
   * aligned with sibling fields in a row that have no hint (spec §11.6).
   */
  hintPosition?: "top" | "bottom";
  /** Error message; when present the control is marked invalid. */
  error?: ReactNode;
  className?: string;
  /**
   * A single form control (Input, Textarea, Select, …). Field injects `id`,
   * `aria-describedby`, `aria-invalid`, and `required` so association is correct
   * without callers repeating boilerplate (spec §23 error association).
   */
  children: ReactElement<{
    id?: string;
    "aria-describedby"?: string;
    "aria-invalid"?: boolean;
    invalid?: boolean;
    required?: boolean;
  }>;
}

/**
 * Form field wrapper: label + optional hint + optional error, all correctly
 * associated to the control via `aria-describedby` / `aria-invalid` (spec §23,
 * §11.6 transparent validation). Error text is announced via `role="alert"`.
 */
export function Field({
  label,
  required,
  requiredLabel,
  hint,
  hintPosition = "top",
  error,
  className,
  children,
}: FieldProps) {
  const controlId = useId();
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;

  const describedBy =
    [hint ? hintId : null, error ? errorId : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const control = isValidElement(children)
    ? cloneElement(children, {
        id: controlId,
        "aria-describedby": describedBy,
        invalid: Boolean(error),
        required,
      })
    : children;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <Label htmlFor={controlId} required={required} requiredLabel={requiredLabel}>
        {label}
      </Label>
      {hint && hintPosition === "top" ? (
        <p id={hintId} className="type-caption">
          {hint}
        </p>
      ) : null}
      {control}
      {hint && hintPosition === "bottom" ? (
        <p id={hintId} className="type-caption">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className="type-body-sm text-status-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
