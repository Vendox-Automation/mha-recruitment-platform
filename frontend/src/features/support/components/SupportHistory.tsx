"use client";

import { useQuery } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";

import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  Skeleton,
} from "@/components/ui";

import { supportRequestsKey } from "../queryKeys";
import { listMySupportRequests } from "../service";
import { categoryKey, statusTone } from "../support";
import type { SupportRequest } from "../types";

/** Message excerpt length for the history list (full text is on the record). */
const EXCERPT_LENGTH = 140;

/**
 * The signed-in candidate's own support-request history (spec §14.5, §15.7).
 * Read-only: category, a message excerpt, a status badge, and the date. The
 * attachment is shown as a presence label only — never a link (ADR-0001 §5).
 *
 * States: loading (skeleton rows), error (retry), empty, and the populated list.
 */
export function SupportHistory() {
  const t = useTranslations("candidate.support");
  const tCategories = useTranslations("support.form.categories");
  const tStatus = useTranslations("support.status");
  const tStates = useTranslations("common.states");
  const locale = useLocale();

  const query = useQuery<SupportRequest[]>({
    queryKey: supportRequestsKey(locale),
    queryFn: () => listMySupportRequests(locale),
    staleTime: 30_000,
  });

  if (query.isLoading) {
    return (
      <div
        className="flex flex-col gap-3"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <span className="sr-only">{tStates("loadingSpinner")}</span>
        {[0, 1].map((row) => (
          <Card key={row} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </Card>
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <Card>
        <ErrorState
          title={t("historyErrorTitle")}
          description={t("historyErrorBody")}
          action={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => query.refetch()}
            >
              {tStates("retry")}
            </Button>
          }
        />
      </Card>
    );
  }

  const requests = query.data ?? [];

  if (requests.length === 0) {
    return (
      <Card>
        <EmptyState
          title={t("historyEmptyTitle")}
          description={t("historyEmptyBody")}
        />
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {requests.map((request) => (
        <li key={request.id}>
          <Card as="article" className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="type-label text-text-primary">
                {tCategories(categoryKey(request.category))}
              </span>
              <Badge tone={statusTone(request.status)} withDot>
                {tStatus(request.status)}
              </Badge>
            </div>
            <p className="type-body-sm text-text-secondary">
              {excerpt(request.message)}
            </p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 type-caption text-text-muted">
              <time dateTime={request.created_at}>
                {formatDateTime(request.created_at, locale)}
              </time>
              {request.job_title ? (
                <span>{t("aboutJob", { title: request.job_title })}</span>
              ) : null}
              {request.has_attachment ? (
                <span>{t("attachmentLabel")}</span>
              ) : null}
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}

/** Trim a message to a readable excerpt without cutting mid-word too harshly. */
function excerpt(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= EXCERPT_LENGTH) return trimmed;
  return `${trimmed.slice(0, EXCERPT_LENGTH).trimEnd()}…`;
}

/** Locale-aware date for the request timestamp (raw value if unparseable). */
function formatDateTime(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}
