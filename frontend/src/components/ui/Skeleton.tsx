import type { HTMLAttributes } from "react";

import { cn } from "@/lib/cn";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  /** Renders a circle (e.g. avatar / logo placeholder). */
  circle?: boolean;
}

/**
 * Content placeholder shown while data loads (spec §25 "use skeletons rather
 * than blocking spinners where appropriate"). The pulse is CSS-only and is
 * stilled under reduced-motion. Decorative — marked `aria-hidden`; pair with a
 * visually-hidden status message for screen readers where needed.
 */
export function Skeleton({ circle, className, ...props }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "motion-pulse bg-surface-subtle",
        circle ? "rounded-full" : "rounded-md",
        className,
      )}
      {...props}
    />
  );
}
