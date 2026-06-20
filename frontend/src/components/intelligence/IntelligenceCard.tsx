import type { ReactNode } from "react";

import { Card } from "@/components/ui";

import { SourceLabel, type IntelligenceSource } from "./SourceLabel";

export interface IntelligenceCardProps {
  title: ReactNode;
  body?: ReactNode;
  source: IntelligenceSource;
  /** Optional honest note (e.g. "live aggregates appear once data exists"). */
  note?: ReactNode;
  children?: ReactNode;
  tone?: "default" | "subtle";
}

/**
 * A single Career Intelligence Console module (spec §5.3, §13.5). Always shows
 * its {@link SourceLabel}; never renders fabricated live values. Heavier data
 * visualisation can be slotted into `children` in later phases.
 */
export function IntelligenceCard({
  title,
  body,
  source,
  note,
  children,
  tone = "default",
}: IntelligenceCardProps) {
  return (
    <Card tone={tone === "subtle" ? "subtle" : "default"} className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <h3 className="type-heading-3 text-text-primary">{title}</h3>
        <SourceLabel source={source} />
      </div>
      {body ? <p className="type-body-sm text-text-secondary">{body}</p> : null}
      {children}
      {note ? <p className="type-caption">{note}</p> : null}
    </Card>
  );
}
