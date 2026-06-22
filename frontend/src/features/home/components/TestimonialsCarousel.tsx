"use client";

import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import { SourceLabel } from "@/components/intelligence/SourceLabel";
import { Card } from "@/components/ui";
import { cn } from "@/lib/cn";

import { TESTIMONIALS } from "../testimonials";

/**
 * Homepage testimonials carousel (spec §14.1 social proof, AGENTS §13 honest
 * sourcing). Shows one illustrative quote at a time with previous/next controls
 * and dots; auto-advances only when motion is allowed.
 *
 * INTEGRITY: the quotes are synthetic POC data (see {@link TESTIMONIALS}); the
 * block carries an "Illustrative preview" {@link SourceLabel} and shows no
 * aggregate rating metric — only per-quote illustrative stars.
 *
 * ACCESSIBILITY (spec §13.7, §15): the active quote sits in an `aria-live`
 * region; controls are labelled; stars expose a text rating via `aria-label`;
 * auto-advance is disabled under `prefers-reduced-motion`.
 */
function Stars({ rating, label }: { rating: number; label: string }) {
  return (
    <div className="flex items-center gap-0.5" role="img" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          aria-hidden="true"
          viewBox="0 0 20 20"
          className={cn(
            "h-4 w-4 fill-current text-data-series-4",
            n <= rating ? "opacity-100" : "opacity-25",
          )}
        >
          <path d="M10 1.6l2.47 5.01 5.53.8-4 3.9.94 5.5L10 20.1l-4.95 2.6.95-5.5-4-3.9 5.53-.8z" />
        </svg>
      ))}
    </div>
  );
}

export function TestimonialsCarousel() {
  const t = useTranslations("home.testimonials");
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  const count = TESTIMONIALS.length;
  const active = TESTIMONIALS[index];

  const go = (dir: number) => setIndex((i) => (i + dir + count) % count);

  useEffect(() => {
    if (reduceMotion) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => clearInterval(id);
  }, [reduceMotion, count]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-5">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="type-heading-2 text-text-primary">{t("title")}</h2>
        <SourceLabel source="illustrativePreview" />
      </div>

      <Card tone="subtle" className="w-full">
        <div className="flex items-center gap-3 sm:gap-5">
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t("previous")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-default text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ‹
            </span>
          </button>

          <div
            aria-live="polite"
            className="flex min-h-[9rem] flex-1 flex-col items-center gap-4 text-center"
          >
            <Stars
              rating={active.rating}
              label={t("ratingLabel", { rating: active.rating })}
            />
            <blockquote className="type-body text-text-primary">
              “{t(`items.${active.key}.quote`)}”
            </blockquote>
            <p className="type-body-sm text-text-secondary">
              <span className="font-semibold text-text-primary">
                {active.author}
              </span>{" "}
              · {t(`items.${active.key}.role`)}, {active.company}
            </p>
          </div>

          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t("next")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-default text-text-secondary transition-colors hover:bg-surface-subtle hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            <span aria-hidden="true" className="text-xl leading-none">
              ›
            </span>
          </button>
        </div>

        <div className="mt-5 flex items-center justify-center gap-2">
          {TESTIMONIALS.map((item, i) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={t("goTo", { number: i + 1 })}
              aria-current={i === index ? "true" : undefined}
              className={cn(
                "h-2 w-2 rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus-ring",
                i === index ? "bg-brand-primary" : "bg-border-default",
              )}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}
