"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";

import { Button, Field, Textarea } from "@/components/ui";

/** Selector for the elements a keyboard user can Tab through inside the dialog. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

export interface RejectEmployerDialogProps {
  open: boolean;
  /** Company name shown in the prompt so the reviewer confirms the target. */
  companyName: string;
  /** True while the reject mutation is in flight; disables the controls. */
  pending?: boolean;
  /** Server-side error message (e.g. illegal transition) to surface inline. */
  serverError?: string | null;
  /** Submit the reason; the parent runs the mutation. */
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

/**
 * Accessible reject dialog (spec §23). A native modal pattern — `role="dialog"`
 * + `aria-modal`, labelled by its title, Escape to cancel — with a focus TRAP
 * (Tab / Shift+Tab cycle within), focus moved to the textarea on open and
 * RESTORED to the opener on close. The reason is required: an empty submit
 * shows a validation message and never calls the server. No animation library.
 */
export function RejectEmployerDialog({
  open,
  companyName,
  pending = false,
  serverError,
  onConfirm,
  onCancel,
}: RejectEmployerDialogProps) {
  const t = useTranslations("admin.reject");
  const tCommon = useTranslations("common");
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const opener = useRef<Element | null>(null);

  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  const [wasOpen, setWasOpen] = useState(open);

  // Reset the field on each open→close transition's reopen, without an effect
  // (adjust-state-during-render pattern; see DashboardShell). This keeps each
  // rejection decision starting from a clean, untouched field.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setReason("");
      setTouched(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    textareaRef.current?.focus();
    return () => {
      const target = opener.current;
      if (target instanceof HTMLElement && document.contains(target)) {
        target.focus();
      }
    };
  }, [open]);

  if (!open) return null;

  const trimmed = reason.trim();
  const showRequiredError = touched && trimmed.length === 0;
  const errorMessage = showRequiredError
    ? t("reasonRequired")
    : serverError ?? undefined;

  function handleConfirm() {
    setTouched(true);
    if (trimmed.length === 0) {
      textareaRef.current?.focus();
      return;
    }
    onConfirm(trimmed);
  }

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
          {t("title")}
        </h2>
        <p id={descId} className="type-body-sm mt-2 text-text-secondary">
          {t("description", { company: companyName })}
        </p>
        <div className="mt-4">
          <Field
            label={t("reasonLabel")}
            required
            requiredLabel={t("reasonRequiredLabel")}
            hint={t("reasonHint")}
            error={errorMessage}
          >
            <Textarea
              ref={textareaRef}
              value={reason}
              disabled={pending}
              onChange={(event) => setReason(event.target.value)}
              onBlur={() => setTouched(true)}
              placeholder={t("reasonPlaceholder")}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button
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
            onClick={handleConfirm}
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
