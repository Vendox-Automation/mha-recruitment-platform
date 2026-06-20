import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type CardTone = "default" | "subtle" | "inverse";

export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  tone?: CardTone;
  /** Adds default interior padding. Set false for media/full-bleed content. */
  padded?: boolean;
  /** Subtle hover affordance for interactive cards. */
  interactive?: boolean;
  children?: ReactNode;
}

const tones: Record<CardTone, string> = {
  default: "bg-surface-canvas border-border-default text-text-primary",
  subtle: "bg-surface-raised border-border-default text-text-primary",
  inverse: "bg-surface-inverse border-transparent text-text-inverse",
};

/**
 * Surface container with tonal separation and a low/medium radius (spec §12.5:
 * borders and tonal separation before heavy shadows; not endless floating
 * rounded cards). Tokens only.
 */
export function Card({
  as: Tag = "div",
  tone = "default",
  padded = true,
  interactive = false,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <Tag
      className={cn(
        "rounded-lg border",
        tones[tone],
        padded && "p-5 sm:p-6",
        interactive &&
          "transition-colors duration-150 hover:border-border-strong",
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
