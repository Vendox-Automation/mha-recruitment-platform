"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent } from "react";

import { Button } from "@/components/ui";

/** Elements a keyboard user can Tab through inside the dialog. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export type DeleteReviewTargetKind = "review" | "reply";

export interface DeleteReviewDialogProps {
  open: boolean;
  /** Whether the whole review or just its reply is being removed. */
  kind: DeleteReviewTargetKind;
  /** Reviewer name shown so the moderator confirms the target. */
  reviewerName: string;
  /** Company the review belongs to (for context). */
  companyName: string;
  pending?: boolean;
  serverError?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Accessible confirm dialog for deleting a review or its reply (admin scope).
 * Same modal pattern as the employer reject dialog: `role="dialog"` +
 * `aria-modal`, labelled by its title, Escape to cancel, a focus TRAP, focus
 * moved to the cancel button on open and RESTORED to the opener on close. The
 * action is destructive and irreversible, so it is gated behind this explicit
 * confirmation. No animation library.
 */
export function DeleteReviewDialog({
  open,
  kind,
  reviewerName,
  companyName,
  pending = false,
  serverError,
  onConfirm,
  onCancel,
}: DeleteReviewDialogProps) {
  const t = useTranslations("admin.reviews.delete");
  const tCommon = useTranslations("common");
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    cancelRef.current?.focus();
    return () => {
      const target = opener.current;
      if (target instanceof HTMLElement && document.contains(target)) {
        target.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  function trapFocus(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      onCancel();
      return;
    }
    if (event.key !== "Tab") return;

    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
    );
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={trapFocus}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-md rounded-lg border border-border-default bg-surface-canvas p-6 shadow-lg"
      >
        <h2 id={titleId} className="type-heading-3 text-text-primary">
          {t(kind === "reply" ? "replyTitle" : "reviewTitle")}
        </h2>
        <p id={descId} className="type-body-sm mt-2 text-text-secondary">
          {t(kind === "reply" ? "replyDescription" : "reviewDescription", {
            reviewer: reviewerName,
            company: companyName,
          })}
        </p>
        {serverError ? (
          <p role="alert" className="type-body-sm mt-3 text-status-danger">
            {serverError}
          </p>
        ) : null}
        <div className="mt-5 flex justify-end gap-3">
          <Button
            ref={cancelRef}
            variant="secondary"
            size="sm"
            onClick={onCancel}
            disabled={pending}
          >
            {tCommon("actions.cancel")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending || undefined}
          >
            {pending ? t("confirmPending") : t("confirm")}
          </Button>
        </div>
      </div>
    </div>
  );
}
