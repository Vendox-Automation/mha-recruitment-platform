"use client";

import { useTranslations } from "next-intl";

import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

import { PERSPECTIVES } from "../perspective";
import { usePerspective } from "../PerspectiveContext";

/**
 * Architectural step sequence for "How the journey works" (spec §14.1 F) —
 * numbered, ordered, not a playful timeline. Both candidate and employer paths
 * stay side-by-side for EQUAL prominence (spec §11.2); the path matching the
 * selected perspective gets a subtle border emphasis so it connects to the
 * reader's chosen lens without hiding the other side. Emphasis is colour AND a
 * visible label, never colour alone (spec §13.7).
 */
export function JourneySteps() {
  const t = useTranslations("home.journey");
  const { perspective } = usePerspective();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {PERSPECTIVES.map((key) => {
        const active = key === perspective;
        return (
          <Card
            key={key}
            className={cn(
              "flex flex-col gap-5 transition-colors",
              active && "border-brand-primary ring-1 ring-brand-primary",
            )}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="type-heading-3 text-text-primary">
                {t(`${key}Title`)}
              </h3>
              {active ? (
                <span className="type-caption font-semibold text-brand-primary">
                  {t("yourPath")}
                </span>
              ) : null}
            </div>
            <ol className="flex flex-col gap-4">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <li key={n} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-brand-primary-soft text-sm font-semibold text-brand-primary-strong"
                  >
                    {n}
                  </span>
                  <span className="type-body text-text-secondary">
                    {t(`${key}.step${n}`)}
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        );
      })}
    </div>
  );
}
