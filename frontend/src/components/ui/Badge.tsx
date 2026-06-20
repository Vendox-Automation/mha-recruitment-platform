import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type BadgeTone =
  | "neutral"
  | "brand"
  | "approved"
  | "supported"
  | "easyApply"
  | "info"
  | "success"
  | "warning"
  | "danger";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Optional leading dot — a non-colour status cue is still in the text. */
  withDot?: boolean;
  children: ReactNode;
}

const tones: Record<BadgeTone, string> = {
  neutral: "bg-surface-subtle text-text-secondary border-border-default",
  brand: "bg-brand-primary-soft text-brand-primary-strong border-transparent",
  // "Approved employer" — trust marker (spec §14.2, §14.3).
  approved: "bg-brand-primary-soft text-brand-primary-strong border-transparent",
  // "MHA Recruiter Supported" — consultant layer marker (spec §5.5).
  supported:
    "bg-surface-inverse text-text-inverse border-transparent",
  // "Easy Apply" indicator (spec §14.2).
  easyApply: "bg-surface-canvas text-text-primary border-border-strong",
  info: "bg-surface-subtle text-status-info border-transparent",
  success: "bg-surface-subtle text-status-success border-transparent",
  warning: "bg-surface-subtle text-status-warning border-transparent",
  danger: "bg-surface-subtle text-status-danger border-transparent",
};

const dotColours: Partial<Record<BadgeTone, string>> = {
  info: "bg-status-info",
  success: "bg-status-success",
  warning: "bg-status-warning",
  danger: "bg-status-danger",
  approved: "bg-brand-primary",
  supported: "bg-brand-on-primary",
  brand: "bg-brand-primary",
};

/**
 * Compact status / trust marker (spec §14.2 "Approved employer", "MHA Recruiter
 * Supported", "Easy Apply"). Meaning is always carried by the text, never
 * colour alone (spec §13.7).
 */
export function Badge({
  tone = "neutral",
  withDot,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-semibold",
        tones[tone],
        className,
      )}
      {...props}
    >
      {withDot ? (
        <span
          aria-hidden="true"
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            dotColours[tone] ?? "bg-current",
          )}
        />
      ) : null}
      {children}
    </span>
  );
}
