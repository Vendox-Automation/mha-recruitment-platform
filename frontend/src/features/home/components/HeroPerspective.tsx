"use client";

import { m, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { AnalyticalGraphic, SourceLabel } from "@/components/intelligence";
import { PageContainer } from "@/components/layout";
import { Card, LinkButton } from "@/components/ui";

import { usePerspective } from "../PerspectiveContext";
import { PerspectiveControl } from "./PerspectiveControl";

/**
 * Integrated executive hero with perspective switching (spec §5.1, §13.3,
 * §13.4, §14.1 B). An adaptive asymmetrical grid: a confident MHA headline +
 * concise statement, equally-prominent keyboard-accessible Candidate/Employer
 * controls, one primary + one secondary CTA for the selected perspective, a
 * Career Intelligence Console preview, and an abstract MHA-derived analytical
 * graphic (no unlicensed/fake staff photography — token-based visuals only).
 *
 * Selecting a perspective swaps copy, CTAs, and the highlighted preview metric
 * via the SHARED {@link usePerspective} state — the value panel, console, and
 * journey all react to the same choice. Motion is a short, refined cross-fade
 * of the changed copy (spec §13.4 "without disorienting movement"); under
 * reduced-motion the swap is instant and content stays fully present. Both
 * perspectives' content is real DOM rendered server-side, so the hero is useful
 * before JS hydrates and mobile stacks into a readable single column.
 */
export function HeroPerspective() {
  const t = useTranslations("home.hero");
  const tConsole = useTranslations("home.console");
  const { perspective } = usePerspective();
  const reduceMotion = useReducedMotion();

  const active = t.raw(perspective) as {
    lead: string;
    primaryCta: string;
    secondaryCta: string;
    highlight: { title: string; body: string };
  };

  const primaryHref = perspective === "candidate" ? "/jobs" : "/for-employers";
  const secondaryHref =
    perspective === "candidate" ? "/register/candidate" : "/register/employer";

  // Keyed cross-fade: re-mounts the perspective-specific copy block so it fades
  // between candidate/employer states. Disabled (instant) under reduced motion.
  const swap = reduceMotion
    ? undefined
    : {
        initial: { opacity: 0, y: 6 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <PageContainer width="wide" className="py-14 sm:py-20 lg:py-24">
      <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
        {/* Left: editorial statement + perspective controls */}
        <div className="flex flex-col gap-6">
          <span className="type-eyebrow text-brand-primary">{t("eyebrow")}</span>
          <h1 className="type-display max-w-xl text-balance text-text-primary">
            {t("headline")}
          </h1>
          <p className="type-body-lg max-w-xl text-text-secondary">
            {t("subheadline")}
          </p>

          <PerspectiveControl />

          <m.p
            key={`${perspective}-lead`}
            {...swap}
            className="type-body max-w-xl text-text-secondary"
          >
            {active.lead}
          </m.p>

          <m.div
            key={`${perspective}-cta`}
            {...swap}
            className="flex flex-wrap gap-3"
          >
            <LinkButton href={primaryHref} size="lg">
              {active.primaryCta}
            </LinkButton>
            <LinkButton href={secondaryHref} variant="secondary" size="lg">
              {active.secondaryCta}
            </LinkButton>
          </m.div>
        </div>

        {/* Right: Career Intelligence Console preview + analytical graphic */}
        <div className="flex flex-col gap-4">
          <Card tone="subtle" padded={false} className="overflow-hidden">
            <div className="aspect-[16/9] w-full bg-surface-canvas p-4">
              <AnalyticalGraphic />
            </div>
          </Card>

          {/* Perspective-highlighted console preview card. */}
          <Card className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-3">
              <span className="type-eyebrow text-brand-primary">
                {tConsole("eyebrow")}
              </span>
              <SourceLabel source="mhaInsight" />
            </div>
            <m.div
              key={`${perspective}-highlight`}
              {...swap}
              className="flex flex-col gap-1.5"
            >
              <h2 className="type-heading-3 text-text-primary">
                {active.highlight.title}
              </h2>
              <p className="type-body-sm text-text-secondary">
                {active.highlight.body}
              </p>
            </m.div>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
