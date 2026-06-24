"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";

import { useAuth } from "@/lib/auth";

import type { RatingDistribution } from "../types";
import { ReviewForm } from "./ReviewForm";
import { ReviewList } from "./ReviewList";
import { ReviewSummary } from "./ReviewSummary";

export interface ReviewsSectionProps {
  companySlug: string;
  companyName: string;
  averageRating: number | null;
  reviewCount: number;
  distribution: RatingDistribution;
  /**
   * Invalidate the company detail (its average + distribution) after a new
   * review is posted, so the summary at the top reconciles with the server.
   */
  onReviewAdded?: () => void;
}

/**
 * Full reviews section for the company page: the summary (average + count +
 * distribution), the paginated list, and the "write a review" form. Composes
 * the reviews feature primitives.
 *
 * The employer reply affordance is gated here (UX only — Django authorises
 * every reply): shown when the signed-in user is an APPROVED employer AND the
 * company they own matches the company being viewed. The employer profile in
 * `/auth/me/` exposes `company_name` (not a slug), so the match is by name; a
 * mismatch simply hides the controls and any wrong attempt is a backend 404.
 */
export function ReviewsSection({
  companySlug,
  companyName,
  averageRating,
  reviewCount,
  distribution,
  onReviewAdded,
}: ReviewsSectionProps) {
  const t = useTranslations("reviews");
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isApprovedEmployer =
    user?.role === "EMPLOYER" &&
    user.profile?.approval_status === "APPROVED";
  const ownsCompany =
    typeof user?.profile?.company_name === "string" &&
    user.profile.company_name.trim().length > 0 &&
    user.profile.company_name.trim() === companyName.trim();
  const canReply = Boolean(isApprovedEmployer && ownsCompany);

  function handleReviewAdded() {
    void queryClient.invalidateQueries({ queryKey: ["company", companySlug] });
    onReviewAdded?.();
  }

  return (
    <section aria-labelledby="reviews-heading" className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 id="reviews-heading" className="type-heading-2 text-text-primary">
          {t("section.title")}
        </h2>
        <p className="type-body-sm text-text-secondary">{t("section.lead")}</p>
      </div>

      <ReviewSummary
        averageRating={averageRating}
        reviewCount={reviewCount}
        distribution={distribution}
      />

      <ReviewList
        companySlug={companySlug}
        companyName={companyName}
        canReply={canReply}
      />

      {/* Anyone can post — no account required. */}
      <ReviewForm companySlug={companySlug} onSubmitted={handleReviewAdded} />
    </section>
  );
}
