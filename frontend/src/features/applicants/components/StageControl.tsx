"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import { Button, Field, Select, Textarea } from "@/components/ui";

import { KANBAN_COLUMNS, needsConfirmation, statusLabelKey } from "../board";
import type { ApplicationStatus } from "../types";

/**
 * Stage control for the split-screen review pane (spec §14.12). A fully
 * keyboard-operable native `<select>` of the seven stages plus an optional
 * change note, then an explicit "Update stage" button. A move TO REJECTED is
 * gated by the parent's confirmation flow ({@link needsConfirmation}); this
 * control surfaces the chosen target up via `onSubmit` and lets the parent
 * decide whether to confirm before committing.
 */
export function StageControl({
  current,
  pending,
  onSubmit,
}: {
  current: ApplicationStatus;
  pending: boolean;
  onSubmit: (status: ApplicationStatus, note: string) => void;
}) {
  const t = useTranslations("employer.applicants");
  const [target, setTarget] = useState<ApplicationStatus>(current);
  const [note, setNote] = useState("");

  const changed = target !== current;

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (!changed || pending) return;
        onSubmit(target, note.trim());
        setNote("");
      }}
    >
      <Field label={t("stage.changeLabel")}>
        <Select
          value={target}
          disabled={pending}
          onChange={(event) =>
            setTarget(event.target.value as ApplicationStatus)
          }
        >
          {KANBAN_COLUMNS.map((status) => (
            <option key={status} value={status}>
              {t(statusLabelKey(status))}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t("stage.noteLabel")} hint={t("stage.noteHint")}>
        <Textarea
          rows={2}
          value={note}
          disabled={pending}
          placeholder={t("stage.notePlaceholder")}
          onChange={(event) => setNote(event.target.value)}
        />
      </Field>

      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={!changed || pending}>
          {pending ? t("stage.updating") : t("stage.update")}
        </Button>
        {changed && needsConfirmation(target) ? (
          <span className="type-caption text-status-danger">
            {t("stage.rejectWarning")}
          </span>
        ) : null}
      </div>
    </form>
  );
}
