import type { ReactNode } from "react";

import { cn } from "@/lib/cn";

export interface SectionHeadingProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  /** Heading level for correct document outline (spec §23 semantic headings). */
  as?: "h1" | "h2" | "h3";
  align?: "start" | "center";
  tone?: "default" | "inverse";
  className?: string;
}

/**
 * Editorial section header: eyebrow + heading + optional lead paragraph
 * (spec §5.4 strong editorial hierarchy). Keeps heading levels explicit so the
 * page outline stays correct.
 */
export function SectionHeading({
  eyebrow,
  title,
  lead,
  as: Heading = "h2",
  align = "start",
  tone = "default",
  className,
}: SectionHeadingProps) {
  const headingClass = Heading === "h1" ? "type-heading-1" : "type-heading-2";
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? (
        <span
          className={cn(
            "type-eyebrow",
            tone === "inverse" ? "text-brand-primary-soft" : "text-brand-primary",
          )}
        >
          {eyebrow}
        </span>
      ) : null}
      <Heading
        className={cn(
          headingClass,
          tone === "inverse" ? "text-text-inverse" : "text-text-primary",
        )}
      >
        {title}
      </Heading>
      {lead ? (
        <p
          className={cn(
            "type-body-lg max-w-2xl",
            tone === "inverse" ? "text-text-inverse/80" : "text-text-secondary",
            align === "center" && "mx-auto",
          )}
        >
          {lead}
        </p>
      ) : null}
    </div>
  );
}
