import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

/**
 * Lightweight metadata / keyword chip (e.g. skills, employment type on a job
 * card). Quieter than {@link Badge}; carries no status semantics.
 */
export function Tag({ className, children, ...props }: TagProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm bg-surface-subtle px-2 py-0.5 text-xs text-text-secondary",
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
