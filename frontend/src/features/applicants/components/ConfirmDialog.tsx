"use client";

import { useEffect, useId, useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

import { Button } from "@/components/ui";

/** Selector for the elements a keyboard user can Tab through inside the dialog. */
const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Minimal accessible confirmation dialog (spec §23). Used to confirm a move to
 * REJECTED before it is committed (spec §14.12). No DnD/animation library — a
 * native modal pattern: `role="dialog"` + `aria-modal`, labelled by its title,
 * Escape to cancel, and focus moved to the confirm button on open.
 *
 * Focus management (a11y review A-B2):
 *  - A focus TRAP keeps Tab / Shift+Tab cycling within the dialog (first↔last
 *    focusable) so keyboard focus can never escape behind the modal.
 *  - Focus is RESTORED to whatever element opened the dialog when it closes /
 *    unmounts, so the user is not dropped at the top of the page.
 *
 * We keep it local to the feature rather than adding a dependency.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  confirmTone = "danger",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: "primary" | "danger";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const descId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  // The element that had focus when the dialog opened, to restore on close.
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;

    // Capture the opener, then move focus into the dialog.
    opener.current = document.activeElement;
    confirmRef.current?.focus();

    // On close / unmount, return focus to the opener if it is still focusable.
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
      // Shift+Tab on the first element wraps to the last.
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      // Tab on the last element wraps to the first.
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
          {title}
        </h2>
        <p id={descId} className="type-body-sm mt-2 text-text-secondary">
          {description}
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            ref={confirmRef}
            variant={confirmTone}
            size="sm"
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
