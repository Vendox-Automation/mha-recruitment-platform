import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export type AlertTone = "info" | "success" | "warning" | "danger";

export interface AlertProps {
  tone?: AlertTone;
  /** Optional heading shown in bold above the body. */
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}

const tones: Record<AlertTone, { accent: string }> = {
  info: { accent: "bg-status-info" },
  success: { accent: "bg-status-success" },
  warning: { accent: "bg-status-warning" },
  danger: { accent: "bg-status-danger" },
};

/**
 * Inline message / callout (spec §11.6, §17.5 calm, actionable system messages).
 * Uses a status token for the accent rail; danger/warning use `role="alert"` so
 * they are announced, info/success use `role="status"`. Meaning is in the text,
 * not colour alone (spec §13.7).
 */
export function Alert({ tone = "info", title, children, className }: AlertProps) {
  const config = tones[tone];
  const role = tone === "danger" || tone === "warning" ? "alert" : "status";

  return (
    <div
      role={role}
      className={cn(
        "flex gap-3 rounded-md border border-border-default bg-surface-raised p-4",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn("mt-0.5 w-1 shrink-0 self-stretch rounded-full", config.accent)}
      />
      <div className="min-w-0 flex-1">
        {title ? (
          <p className="type-label text-text-primary">{title}</p>
        ) : null}
        {children ? (
          <div
            className={cn(
              "type-body-sm text-text-secondary",
              title ? "mt-1" : null,
            )}
          >
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
}
