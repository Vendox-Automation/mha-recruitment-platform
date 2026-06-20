import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/cn";

export type ContainerWidth = "default" | "wide" | "narrow";

export interface PageContainerProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  width?: ContainerWidth;
  children: ReactNode;
}

const widths: Record<ContainerWidth, string> = {
  // Editorial reading + dashboard default.
  default: "max-w-6xl",
  // Wide composition for split-screen / analytics-heavy pages.
  wide: "max-w-7xl",
  // Forms, auth, focused content.
  narrow: "max-w-2xl",
};

/**
 * Responsive page-width container with consistent gutters (spec §12.5 page
 * grid, §24 responsive). Centres content and applies controlled max-width;
 * vertical rhythm is owned by {@link Section}.
 */
export function PageContainer({
  as: Tag = "div",
  width = "default",
  className,
  children,
  ...props
}: PageContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full px-4 sm:px-6 lg:px-8",
        widths[width],
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
