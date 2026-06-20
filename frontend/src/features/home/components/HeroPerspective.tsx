"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { AnalyticalGraphic, IntelligenceCard } from "@/components/intelligence";
import { PageContainer } from "@/components/layout";
import { Card, LinkButton } from "@/components/ui";
import { cn } from "@/lib/cn";

type Perspective = "candidate" | "employer";

/**
 * Integrated executive hero with perspective switching (spec §5.1, §13.3,
 * §13.4, §14.1 B). Candidate and Employer controls are equally prominent and
 * keyboard accessible. Selecting a perspective swaps copy, calls to action, and
 * the highlighted intelligence preview — without hiding navigation or causing
 * disorienting movement (spec §13.4). Both perspectives' content is rendered as
 * real DOM; selection toggles emphasis. Motion is a short CSS reveal only,
 * stilled under reduced-motion.
 */
export function HeroPerspective() {
  const t = useTranslations("home.hero");
  const tConsole = useTranslations("home.console");
  const [perspective, setPerspective] = useState<Perspective>("candidate");

  const active = t.raw(perspective) as {
    lead: string;
    primaryCta: string;
    secondaryCta: string;
  };

  const primaryHref = perspective === "candidate" ? "/jobs" : "/for-employers";
  const secondaryHref =
    perspective === "candidate" ? "/register/candidate" : "/register/employer";

  return (
    <PageContainer width="wide" className="py-14 sm:py-20 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        {/* Left: editorial statement + perspective controls */}
        <div className="motion-rise flex flex-col gap-6">
          <span className="type-eyebrow text-brand-primary">{t("eyebrow")}</span>
          <h1 className="type-display max-w-xl text-text-primary">
            {t("headline")}
          </h1>
          <p className="type-body-lg max-w-xl text-text-secondary">
            {t("subheadline")}
          </p>

          <div
            role="group"
            aria-label={t("perspectiveLabel")}
            className="inline-flex w-full max-w-sm rounded-md border border-border-strong p-1"
          >
            {(["candidate", "employer"] as const).map((value) => {
              const selected = value === perspective;
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPerspective(value)}
                  className={cn(
                    "flex-1 rounded-[0.3rem] px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                    selected
                      ? "bg-brand-primary text-brand-on-primary"
                      : "text-text-secondary hover:bg-surface-subtle",
                  )}
                >
                  {t(`perspective.${value}`)}
                </button>
              );
            })}
          </div>

          <p className="type-body max-w-xl text-text-secondary">{active.lead}</p>

          <div className="flex flex-wrap gap-3">
            <LinkButton href={primaryHref} size="lg">
              {active.primaryCta}
            </LinkButton>
            <LinkButton href={secondaryHref} variant="secondary" size="lg">
              {active.secondaryCta}
            </LinkButton>
          </div>
        </div>

        {/* Right: intelligence preview + analytical graphic */}
        <div className="motion-rise motion-rise-delay-1 flex flex-col gap-4">
          <Card tone="subtle" padded={false} className="overflow-hidden">
            <div className="aspect-[16/9] w-full bg-surface-canvas p-4">
              <AnalyticalGraphic />
            </div>
          </Card>
          <IntelligenceCard
            title={tConsole("rolesInFocus.title")}
            body={tConsole("rolesInFocus.body")}
            source="mhaInsight"
          />
        </div>
      </div>
    </PageContainer>
  );
}
