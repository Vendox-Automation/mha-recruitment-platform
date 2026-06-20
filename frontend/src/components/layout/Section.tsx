import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type SectionTone = "canvas" | "raised" | "inverse";
export type SectionSpacing = "sm" | "md" | "lg";

export interface SectionProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  tone?: SectionTone;
  spacing?: SectionSpacing;
  children: ReactNode;
}

const tones: Record<SectionTone, string> = {
  canvas: "bg-surface-canvas text-text-primary",
  raised: "bg-surface-raised text-text-primary",
  // Executive dark section (spec §12.2 darker tones for executive sections).
  inverse: "bg-surface-inverse text-text-inverse",
};

const spacings: Record<SectionSpacing, string> = {
  sm: "py-10 sm:py-12",
  md: "py-14 sm:py-20",
  lg: "py-20 sm:py-28",
};

/**
 * Full-bleed page section providing background tone and vertical rhythm
 * (spec §5.4 clear section sequencing, §12.5 generous controlled whitespace).
 * Pair with {@link PageContainer} for the inner column.
 */
export function Section({
  as: Tag = "section",
  tone = "canvas",
  spacing = "md",
  className,
  children,
  ...props
}: SectionProps) {
  return (
    <Tag
      className={cn(tones[tone], spacings[spacing], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}
