"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui";

import { formatReviewDate } from "../format";
import { companyReviewsKey } from "../queryKeys";
import { listCompanyReviews } from "../service";
import type { CompanyReview } from "../types";
import { ReviewReplyEditor } from "./ReviewReplyEditor";
import { StarRating } from "./StarRating";

export interface ReviewListProps {
  companySlug: string;
  companyName: string;
  /**
   * True when the current viewer is the approved employer that owns this
   * company (gated by the parent). Enables the reply add/edit/delete affordance.
   * UX only — Django authorises every reply mutation.
   */
  canReply: boolean;
}

/**
 * Paginated list of a company's reviews. Each entry shows the reviewer name,
 * the star rating, the date, the optional title + body, and the employer reply
 * (clearly labelled). When `canReply`, the owning employer can add / edit /
 * delete a reply inline. Owns its loading (skeletons), empty ("no reviews
 * yet"), and error/retry states; "Load more" appends the next page.
 */
export function ReviewList({
  companySlug,
  companyName,
  canReply,
}: ReviewListProps) {
  const t = useTranslations("reviews");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: companyReviewsKey(companySlug, page, locale),
    queryFn: () => listCompanyReviews(companySlug, page, locale),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-3" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <Card key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card>
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          action={
            <button
              type="button"
              className="type-body-sm font-semibold text-brand-primary hover:underline"
              onClick={() => query.refetch()}
            >
              {tCommon("retry")}
            </button>
          }
        />
      </Card>
    );
  }

  const reviews = query.data.results;

  if (reviews.length === 0) {
    return (
      <Card>
        <EmptyState compact title={t("list.emptyTitle")} description={t("list.emptyBody")} />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-4" aria-busy={query.isFetching}>
        {reviews.map((review) => (
          <li key={review.id}>
            <ReviewItem
              review={review}
              companySlug={companySlug}
              companyName={companyName}
              canReply={canReply}
              locale={locale}
            />
          </li>
        ))}
      </ul>

      {query.data.next ? (
        <div>
          <Button
            variant="secondary"
            size="sm"
            disabled={query.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            {query.isFetching ? t("list.loadingMore") : t("list.loadMore")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function ReviewItem({
  review,
  companySlug,
  companyName,
  canReply,
  locale,
}: {
  review: CompanyReview;
  companySlug: string;
  companyName: string;
  canReply: boolean;
  locale: string;
}) {
  const t = useTranslations("reviews");
  const date = formatReviewDate(review.created_at, locale);

  return (
    <Card as="article" className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="type-label text-text-primary">{review.reviewer_name}</p>
        {date ? <p className="type-caption text-text-secondary">{date}</p> : null}
      </div>
      <StarRating
        value={review.rating}
        label={t("outOfFive", { rating: review.rating })}
        size="sm"
      />
      {review.title ? (
        <h3 className="type-heading-3 text-text-primary">{review.title}</h3>
      ) : null}
      {review.body ? (
        <p className="type-body-sm whitespace-pre-line text-text-secondary">
          {review.body}
        </p>
      ) : null}

      {/* The employer reply, shown to everyone when present. */}
      {review.reply && !canReply ? (
        <div className="mt-2 rounded-md border-l-2 border-brand-primary bg-surface-subtle p-3">
          <p className="type-label text-text-primary">
            {t("reply.responseFrom", { company: companyName })}
          </p>
          {formatReviewDate(review.reply.created_at, locale) ? (
            <p className="type-caption text-text-secondary">
              {formatReviewDate(review.reply.created_at, locale)}
            </p>
          ) : null}
          <p className="type-body-sm mt-1 whitespace-pre-line text-text-secondary">
            {review.reply.body}
          </p>
        </div>
      ) : null}

      {/* Owning approved employer: add / edit / delete the reply inline. */}
      {canReply ? (
        <ReviewReplyEditor
          reviewId={review.id}
          companySlug={companySlug}
          companyName={companyName}
          reply={review.reply}
        />
      ) : null}
    </Card>
  );
}
