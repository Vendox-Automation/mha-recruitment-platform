"use client";

import { useTranslations } from "next-intl";
import { useId, useState } from "react";

import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

type Perspective = "candidate" | "employer";

const PILLARS: Record<Perspective, string[]> = {
  candidate: ["tracking", "fit", "opportunities", "guidance"],
  employer: ["publishing", "review", "pipeline", "expertise"],
};

/**
 * Perspective value panel (spec §14.1 C). An accessible tablist switches
 * between candidate and employer value pillars; both sets stay semantically
 * present and are simple to toggle (spec §11.2 equal clarity). No content is
 * hidden from assistive tech beyond the inactive panel.
 */
export function ValuePanel() {
  const t = useTranslations("home.value");
  const [perspective, setPerspective] = useState<Perspective>("candidate");
  const baseId = useId();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <span className="type-eyebrow text-brand-primary">{t("eyebrow")}</span>
          <h2 className="type-heading-2 text-text-primary">
            {t(`${perspective}Title`)}
          </h2>
        </div>
        <div role="tablist" aria-label={t("eyebrow")} className="inline-flex rounded-md border border-border-strong p-1">
          {(["candidate", "employer"] as const).map((value) => {
            const selected = value === perspective;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                id={`${baseId}-tab-${value}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel-${value}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setPerspective(value)}
                className={cn(
                  "rounded-[0.3rem] px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                  selected
                    ? "bg-brand-primary text-brand-on-primary"
                    : "text-text-secondary hover:bg-surface-subtle",
                )}
              >
                {t(`${value}Title`)}
              </button>
            );
          })}
        </div>
      </div>

      {(["candidate", "employer"] as const).map((value) => (
        <div
          key={value}
          role="tabpanel"
          id={`${baseId}-panel-${value}`}
          aria-labelledby={`${baseId}-tab-${value}`}
          hidden={value !== perspective}
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        >
          {PILLARS[value].map((pillar) => (
            <Card key={pillar} tone="subtle" className="flex flex-col gap-2">
              <h3 className="type-heading-3 text-text-primary">
                {t(`${value}.${pillar}.title`)}
              </h3>
              <p className="type-body-sm text-text-secondary">
                {t(`${value}.${pillar}.body`)}
              </p>
            </Card>
          ))}
        </div>
      ))}
    </div>
  );
}
