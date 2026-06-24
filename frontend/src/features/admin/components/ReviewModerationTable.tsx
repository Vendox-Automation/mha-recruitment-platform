"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useState } from "react";

import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Skeleton,
} from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";
import { formatReviewDate } from "@/features/reviews/format";
import { adminReviewsListKey } from "@/features/reviews/queryKeys";
import {
  deleteAdminReview,
  deleteAdminReviewReply,
  getAdminReviews,
} from "@/features/reviews/service";
import type {
  AdminReviewListItem,
  RatingFilter,
} from "@/features/reviews/types";

import { useDebouncedValue } from "../useDebouncedValue";
import {
  DeleteReviewDialog,
  type DeleteReviewTargetKind,
} from "./DeleteReviewDialog";

/** Dropdown options: all ratings first, then 5→1 stars. */
const RATING_FILTERS: readonly RatingFilter[] = ["ALL", 5, 4, 3, 2, 1];

interface Feedback {
  tone: "success" | "danger";
  message: string;
}

interface DeleteTarget {
  review: AdminReviewListItem;
  kind: DeleteReviewTargetKind;
}

/**
 * Review moderation table (admin scope). A company filter + search box drive a
 * paginated list of published reviews; each row can have its reply or the whole
 * review removed behind an accessible confirm dialog. Deletion is recorded
 * server-side (audit is the backend's responsibility). Owns the loading
 * (skeletons), empty ("no reviews match"), error/retry, and per-action
 * success/error states; controls disable while a mutation is in flight.
 *
 * Every deletion invalidates the moderation list so the table reconciles with
 * the server (authoritative).
 */
export function ReviewModerationTable() {
  const t = useTranslations("admin.reviews");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [companyInput, setCompanyInput] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [rating, setRating] = useState<RatingFilter>("ALL");
  const [page, setPage] = useState(1);
  const company = useDebouncedValue(companyInput.trim(), 300);
  const search = useDebouncedValue(searchInput.trim(), 300);

  const [target, setTarget] = useState<DeleteTarget | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const params = { company, search, rating, page };
  const query = useQuery({
    queryKey: adminReviewsListKey(params),
    queryFn: () => getAdminReviews(params, locale),
    placeholderData: keepPreviousData,
  });

  const mutation = useMutation({
    mutationFn: (vars: DeleteTarget) =>
      vars.kind === "reply"
        ? deleteAdminReviewReply(vars.review.id, locale)
        : deleteAdminReview(vars.review.id, locale),
    onSuccess: (_data, vars) => {
      setFeedback({
        tone: "success",
        message: t(
          vars.kind === "reply" ? "feedback.replyDeleted" : "feedback.reviewDeleted",
          { reviewer: vars.review.reviewer_name },
        ),
      });
      setTarget(null);
      setDialogError(null);
      void queryClient.invalidateQueries({ queryKey: ["reviews", "admin"] });
    },
    onError: (error) => {
      const message =
        error instanceof ApiRequestError
          ? error.message
          : tCommon("errorDescription");
      setDialogError(message);
    },
  });

  function changeCompany(next: string) {
    setCompanyInput(next);
    setPage(1);
    setFeedback(null);
  }

  function changeSearch(next: string) {
    setSearchInput(next);
    setPage(1);
    setFeedback(null);
  }

  function changeRating(next: RatingFilter) {
    setRating(next);
    setPage(1);
    setFeedback(null);
  }

  function openDelete(review: AdminReviewListItem, kind: DeleteReviewTargetKind) {
    setDialogError(null);
    setFeedback(null);
    setTarget({ review, kind });
  }

  const companyId = useId();
  const searchId = useId();
  const ratingId = useId();
  const data = query.data;
  const results = data?.results ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <Field label={t("filters.companyLabel")} className="sm:w-64">
          <Input
            id={companyId}
            type="search"
            value={companyInput}
            onChange={(event) => changeCompany(event.target.value)}
            placeholder={t("filters.companyPlaceholder")}
          />
        </Field>
        <Field label={t("filters.ratingLabel")} className="sm:w-44">
          <Select
            id={ratingId}
            value={String(rating)}
            onChange={(event) =>
              changeRating(
                event.target.value === "ALL"
                  ? "ALL"
                  : (Number(event.target.value) as RatingFilter),
              )
            }
          >
            {RATING_FILTERS.map((value) => (
              <option key={value} value={value}>
                {value === "ALL"
                  ? t("filters.ratingAll")
                  : t("filters.ratingStars", { rating: value })}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("filters.searchLabel")} className="flex-1">
          <Input
            id={searchId}
            type="search"
            value={searchInput}
            onChange={(event) => changeSearch(event.target.value)}
            placeholder={t("filters.searchPlaceholder")}
          />
        </Field>
      </div>

      {feedback ? (
        <Alert tone={feedback.tone === "success" ? "success" : "danger"}>
          {feedback.message}
        </Alert>
      ) : null}

      {query.isLoading ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : query.isError || !data ? (
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
      ) : results.length === 0 ? (
        <Card>
          <EmptyState title={t("emptyTitle")} description={t("emptyBody")} />
        </Card>
      ) : (
        <ul className="flex flex-col gap-3" aria-busy={query.isFetching}>
          {results.map((review) => (
            <li key={review.id}>
              <ReviewRow
                review={review}
                locale={locale}
                disabled={mutation.isPending}
                onDelete={openDelete}
              />
            </li>
          ))}
        </ul>
      )}

      {data && (data.next || data.previous) ? (
        <nav
          className="flex items-center justify-between gap-3"
          aria-label={t("pagination.label")}
        >
          <Button
            variant="secondary"
            size="sm"
            disabled={!data.previous || query.isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            {t("pagination.previous")}
          </Button>
          <span className="type-body-sm text-text-secondary" aria-live="polite">
            {t("pagination.pageStatus", { page })}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={!data.next || query.isFetching}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("pagination.next")}
          </Button>
        </nav>
      ) : null}

      <DeleteReviewDialog
        open={target !== null}
        kind={target?.kind ?? "review"}
        reviewerName={target?.review.reviewer_name ?? ""}
        companyName={target?.review.company_name ?? ""}
        pending={mutation.isPending}
        serverError={dialogError}
        onConfirm={() => {
          if (target) mutation.mutate(target);
        }}
        onCancel={() => {
          setTarget(null);
          setDialogError(null);
        }}
      />
    </div>
  );
}

function ReviewRow({
  review,
  locale,
  disabled,
  onDelete,
}: {
  review: AdminReviewListItem;
  locale: string;
  disabled: boolean;
  onDelete: (review: AdminReviewListItem, kind: DeleteReviewTargetKind) => void;
}) {
  const t = useTranslations("admin.reviews");
  const created = formatReviewDate(review.created_at, locale);

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="type-heading-3 text-text-primary">
            {review.company_name}
          </p>
          <p className="type-body-sm text-text-secondary">
            {review.reviewer_name} · {review.reviewer_email}
          </p>
          <p className="type-caption text-text-secondary">
            {t("ratingValue", { rating: review.rating })}
            {created ? ` · ${created}` : ""}
          </p>
        </div>
        {review.has_reply ? (
          <Badge tone="info" withDot>
            {t("hasReply")}
          </Badge>
        ) : null}
      </div>

      {review.title ? (
        <p className="type-label text-text-primary">{review.title}</p>
      ) : null}
      {review.body ? (
        <p className="type-body-sm whitespace-pre-line text-text-secondary">
          {review.body}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {review.has_reply ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={disabled}
            onClick={() => onDelete(review, "reply")}
          >
            {t("actions.deleteReply")}
          </Button>
        ) : null}
        <Button
          size="sm"
          variant="danger"
          disabled={disabled}
          onClick={() => onDelete(review, "review")}
        >
          {t("actions.deleteReview")}
        </Button>
      </div>
    </Card>
  );
}
