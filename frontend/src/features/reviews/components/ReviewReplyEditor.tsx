"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Alert, Button, Field, Textarea } from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";

import { formatReviewDate } from "../format";
import { companyReviewsRootKey } from "../queryKeys";
import { deleteReviewReply, replyToReview } from "../service";
import type { ReviewReply } from "../types";

export interface ReviewReplyEditorProps {
  reviewId: number;
  /** Slug of the company whose reviews cache should refresh after a change. */
  companySlug: string;
  /** Company name shown in the "Response from {company}" label. */
  companyName: string;
  /** The existing reply, or null when none has been posted yet. */
  reply: ReviewReply | null;
}

/**
 * Employer reply affordance for a single review (own company only). Renders the
 * existing reply with edit / delete controls, or a "Reply" trigger that opens a
 * compose box. Add and edit POST the reply; delete removes it. Every successful
 * mutation invalidates the company's reviews so the public list reconciles with
 * the server (authoritative). Rendered only when the viewer is gated as the
 * owning approved employer (see {@link ReviewList}).
 */
export function ReviewReplyEditor({
  reviewId,
  companySlug,
  companyName,
  reply,
}: ReviewReplyEditorProps) {
  const t = useTranslations("reviews");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  function invalidate() {
    void queryClient.invalidateQueries({
      queryKey: companyReviewsRootKey(companySlug),
    });
  }

  const saveMutation = useMutation({
    mutationFn: (body: string) => replyToReview(reviewId, body, locale),
    onSuccess: () => {
      setEditing(false);
      setError(null);
      invalidate();
    },
    onError: (err) => setError(resolveError(err)),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteReviewReply(reviewId, locale),
    onSuccess: () => {
      setError(null);
      invalidate();
    },
    onError: (err) => setError(resolveError(err)),
  });

  function resolveError(err: unknown): string {
    if (err instanceof ApiRequestError) {
      const fieldError = err.fields?.body?.[0];
      return fieldError ?? err.message;
    }
    return tCommon("states.errorDescription");
  }

  const pending = saveMutation.isPending || deleteMutation.isPending;

  function startEditing() {
    setDraft(reply?.body ?? "");
    setError(null);
    setEditing(true);
  }

  function handleSave() {
    const trimmed = draft.trim();
    if (trimmed.length === 0) {
      setError(t("reply.required"));
      return;
    }
    saveMutation.mutate(trimmed);
  }

  // Compose / edit box.
  if (editing) {
    return (
      <div className="mt-3 rounded-md border border-border-default bg-surface-subtle p-3">
        <Field label={t("reply.label")} error={error ?? undefined}>
          <Textarea
            rows={3}
            value={draft}
            disabled={pending}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("reply.placeholder")}
            autoFocus
          />
        </Field>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={pending}
            aria-busy={saveMutation.isPending || undefined}
          >
            {saveMutation.isPending ? t("reply.saving") : t("reply.save")}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditing(false);
              setError(null);
            }}
            disabled={pending}
          >
            {tCommon("actions.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  // Existing reply with employer edit / delete controls.
  if (reply) {
    const date = formatReviewDate(reply.created_at, locale);
    return (
      <div className="mt-3 rounded-md border-l-2 border-brand-primary bg-surface-subtle p-3">
        <p className="type-label text-text-primary">
          {t("reply.responseFrom", { company: companyName })}
        </p>
        {date ? (
          <p className="type-caption text-text-secondary">{date}</p>
        ) : null}
        <p className="type-body-sm mt-1 whitespace-pre-line text-text-secondary">
          {reply.body}
        </p>
        {error ? (
          <Alert tone="danger" className="mt-2">
            {error}
          </Alert>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={startEditing} disabled={pending}>
            {t("reply.edit")}
          </Button>
          <Button
            size="sm"
            variant="danger"
            onClick={() => deleteMutation.mutate()}
            disabled={pending}
            aria-busy={deleteMutation.isPending || undefined}
          >
            {deleteMutation.isPending ? t("reply.deleting") : t("reply.delete")}
          </Button>
        </div>
      </div>
    );
  }

  // No reply yet — offer to add one.
  return (
    <div className="mt-3">
      {error ? (
        <Alert tone="danger" className="mb-2">
          {error}
        </Alert>
      ) : null}
      <Button size="sm" variant="secondary" onClick={startEditing} disabled={pending}>
        {t("reply.add")}
      </Button>
    </div>
  );
}
