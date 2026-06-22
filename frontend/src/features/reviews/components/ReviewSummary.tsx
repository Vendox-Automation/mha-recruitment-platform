"use client";

import { useTranslations } from "next-intl";

import { StarRating } from "./StarRating";
import type { RatingDistribution } from "../types";

export interface ReviewSummaryProps {
  averageRating: number | null;
  reviewCount: number;
  distribution: RatingDistribution;
}

/**
 * Reviews summary: the large average, the total count, and a 5→1 distribution
 * as labelled bars. When there are no reviews it shows an honest "No reviews
 * yet" rather than a misleading zero average. Each bar carries a text
 * alternative so the breakdown is available to assistive tech.
 */
export function ReviewSummary({
  averageRating,
  reviewCount,
  distribution,
}: ReviewSummaryProps) {
  const t = useTranslations("reviews");

  if (reviewCount === 0 || averageRating === null) {
    return (
      <p className="type-body-sm text-text-secondary">{t("summary.empty")}</p>
    );
  }

  const average = averageRating;
  const formattedAverage = average.toFixed(1);

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="flex flex-col items-start gap-1">
        <p className="type-heading-1 leading-none text-text-primary">
          {formattedAverage}
        </p>
        <StarRating
          value={average}
          label={t("outOfFive", { rating: formattedAverage })}
          size="md"
        />
        <p className="type-body-sm text-text-secondary">
          {t("summary.count", { count: reviewCount })}
        </p>
      </div>

      <ul className="flex flex-1 flex-col gap-1.5" aria-label={t("summary.breakdown")}>
        {[5, 4, 3, 2, 1].map((star) => {
          const count = distribution[String(star) as keyof RatingDistribution] ?? 0;
          const percent = reviewCount > 0 ? (count / reviewCount) * 100 : 0;
          return (
            <li key={star} className="flex items-center gap-3">
              <span className="type-caption w-16 shrink-0 text-text-secondary">
                {t("summary.starsLabel", { stars: star })}
              </span>
              <span
                className="h-2 flex-1 overflow-hidden rounded-full bg-surface-subtle"
                role="img"
                aria-label={t("summary.barLabel", {
                  stars: star,
                  count,
                })}
              >
                <span
                  aria-hidden="true"
                  className="block h-full rounded-full bg-status-warning"
                  style={{ width: `${percent}%` }}
                />
              </span>
              <span className="type-caption w-8 shrink-0 text-right text-text-secondary">
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
