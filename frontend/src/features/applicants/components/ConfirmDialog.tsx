"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui";

/**
 * Minimal accessible confirmation dialog (spec §23). Used to confirm a move to
 * REJECTED before it is committed (spec §14.12). No DnD/animation library — a
 * native modal pattern: `role="dialog"` + `aria-modal`, labelled by its title,
 * Escape to cancel, and focus moved to the confirm button on open. We keep it
 * local to the feature rather than adding a dependency.
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
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      confirmRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onKeyDown={(event) => {
        if (event.key === "Escape") onCancel();
      }}
    >
      <div
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
