"use client";

import { useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

import { SourceLabel } from "@/components/intelligence/SourceLabel";
import { cn } from "@/lib/cn";

import { TRUSTED_COMPANIES, type TrustedCompany } from "../trustedCompanies";

/**
 * Homepage "trusted by" social-proof band (spec §14.1 — credible trust signals,
 * AGENTS §13 honest sourcing). Renders an auto-scrolling logo marquee that
 * demonstrates the tiered ("featured") placement model.
 *
 * INTEGRITY: the companies are synthetic POC data (see {@link TRUSTED_COMPANIES})
 * and the band always shows a "Illustrative preview" {@link SourceLabel}, so it
 * never implies real adoption (CLAUDE.md "no invented proof"; AGENTS §8).
 *
 * ACCESSIBILITY (spec §13.7): under `prefers-reduced-motion` the marquee is
 * replaced by a static, centred grid with no animation — information is never
 * conveyed by motion alone. With motion enabled, hovering pauses the scroll so
 * readers can stop on a logo. The duplicated track copy is `aria-hidden`.
 */
function CompanyLogo({ company }: { company: TrustedCompany }) {
  const { name, monogram, featured } = company;
  return (
    <div
      className={cn(
        "flex shrink-0 items-center gap-2.5 grayscale transition-opacity",
        featured ? "opacity-90 hover:opacity-100" : "opacity-60 hover:opacity-90",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex items-center justify-center rounded-md border border-border-default bg-surface-canvas font-semibold text-text-secondary",
          featured ? "h-11 w-11 text-base" : "h-9 w-9 text-sm",
        )}
      >
        {monogram}
      </span>
      <span
        className={cn(
          "whitespace-nowrap font-semibold tracking-tight text-text-secondary",
          featured ? "text-lg" : "text-base",
        )}
      >
        {name}
      </span>
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
          {TRUSTED_COMPANIES.map((company) => (
            <li key={company.name}>
              <CompanyLogo company={company} />
            </li>
          ))}
        </ul>
      ) : (
        <div
          role="group"
          aria-label={t("marqueeLabel")}
          className="group w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_8%,#000_92%,transparent)]"
        >
          <div className="flex w-max animate-[mha-marquee_60s_linear_infinite] gap-x-10 group-hover:[animation-play-state:paused]">
            {[0, 1].map((copy) => (
              <ul
                key={copy}
                aria-hidden={copy === 1}
                className="flex shrink-0 items-center gap-x-10"
              >
                {TRUSTED_COMPANIES.map((company) => (
                  <li key={company.name}>
                    <CompanyLogo company={company} />
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
