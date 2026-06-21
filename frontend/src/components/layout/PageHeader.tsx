import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Right-aligned actions (e.g. primary button). */
  actions?: ReactNode;
  className?: string;
}

/**
 * Working-screen page header (spec §11.8 "where am I / what next"). Calm,
 * single H1, optional actions. Used at the top of dashboard / area pages.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5">
        {eyebrow ? (
          <span className="type-eyebrow text-brand-primary">{eyebrow}</span>
        ) : null}
        <h1 className="type-heading-1 text-text-primary">{title}</h1>
        {description ? (
          <p className="type-body max-w-2xl text-text-secondary">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
