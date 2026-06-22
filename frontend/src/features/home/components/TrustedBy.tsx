"use client";

import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { SourceLabel } from "@/components/intelligence/SourceLabel";
import { cn } from "@/lib/cn";

import { TRUSTED_COMPANIES, type TrustedCompany } from "../trustedCompanies";
import { VendoxMark } from "./VendoxMark";

/**
 * Homepage "trusted by" social-proof band (spec §14.1 — credible trust signals,
 * AGENTS §13 honest sourcing). Two logo rows scroll in opposite directions;
 * companies render as coloured wordmarks (Vendox uses its real brand mark).
 *
 * INTEGRITY: apart from Vendox (the operator's own brand) the companies are
 * synthetic POC data (see {@link TRUSTED_COMPANIES}); the band always shows an
 * "Illustrative preview" {@link SourceLabel}, so it never implies real adoption
 * (CLAUDE.md "no invented proof"; AGENTS §8).
 *
 * ACCESSIBILITY (spec §13.7): under `prefers-reduced-motion` both marquees are
 * replaced by a static grid with no animation. With motion on, hovering pauses
 * the scroll so readers can stop on a logo; the duplicated track is aria-hidden.
 */

// Static class literals so the Tailwind scanner keeps these colour utilities.
const TEXT_COLOURS = [
  "text-data-series-1",
  "text-data-series-2",
  "text-data-series-3",
  "text-data-series-4",
  "text-data-series-5",
  "text-data-series-6",
];
const BORDER_COLOURS = [
  "border-data-series-1",
  "border-data-series-2",
  "border-data-series-3",
  "border-data-series-4",
  "border-data-series-5",
  "border-data-series-6",
];

type ColouredCompany = TrustedCompany & { colour: number };

const COMPANIES: ColouredCompany[] = TRUSTED_COMPANIES.map((c, i) => ({
  ...c,
  colour: i % TEXT_COLOURS.length,
}));
// Split across two rows so each marquee carries a distinct set.
const ROW_A = COMPANIES.filter((_, i) => i % 2 === 0);
const ROW_B = COMPANIES.filter((_, i) => i % 2 === 1);

function CompanyLogo({ company }: { company: ColouredCompany }) {
  const { name, monogram, featured, brandMark, colour } = company;

  if (brandMark === "vendox") {
    return (
      <div className="flex shrink-0 items-center gap-2.5">
        <VendoxMark
          aria-hidden="true"
          className={featured ? "h-11 w-11" : "h-9 w-9"}
        />
        <span
          className={cn(
            "whitespace-nowrap font-semibold tracking-tight text-text-primary",
            featured ? "text-lg" : "text-base",
          )}
        >
          {name}
        </span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2.5 opacity-90 transition-opacity hover:opacity-100">
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-md border bg-surface-canvas font-semibold",
          BORDER_COLOURS[colour],
          TEXT_COLOURS[colour],
          featured ? "h-11 w-11 text-base" : "h-9 w-9 text-sm",
        )}
      >
        {monogram}
      </span>
      <span
        className={cn(
          "whitespace-nowrap font-semibold tracking-tight",
          TEXT_COLOURS[colour],
          featured ? "text-lg" : "text-base",
        )}
      >
        {name}
      </span>
    </div>
  );
}

function MarqueeRow({
  items,
  reverse,
}: {
  items: ColouredCompany[];
  reverse?: boolean;
}) {
  return (
    <div className="group w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]">
      <div
        className={cn(
          "flex w-max gap-x-10 group-hover:[animation-play-state:paused]",
          reverse
            ? "animate-[mha-marquee_65s_linear_infinite_reverse]"
            : "animate-[mha-marquee_55s_linear_infinite]",
        )}
      >
        {[0, 1].map((copy) => (
          <ul
            key={copy}
            aria-hidden={copy === 1}
            className="flex shrink-0 items-center gap-x-10"
          >
            {items.map((company) => (
              <li key={company.name}>
                <CompanyLogo company={company} />
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  );
}

export function TrustedBy() {
  const t = useTranslations("home.trustedBy");
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex flex-col items-center gap-7">
      <div className="flex flex-col items-center gap-3 text-center">
        <h2 className="type-eyebrow text-text-secondary">{t("title")}</h2>
        <SourceLabel source="illustrativePreview" />
      </div>

      {reduceMotion ? (
        <ul
          aria-label={t("marqueeLabel")}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5"
        >
          {COMPANIES.map((company) => (
            <li key={company.name}>
              <CompanyLogo company={company} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          role="group"
          aria-label={t("marqueeLabel")}
          className="flex w-full flex-col gap-6"
        >
          <MarqueeRow items={ROW_A} />
          <MarqueeRow items={ROW_B} reverse />
        </div>
      )}
    </div>
  );
}
