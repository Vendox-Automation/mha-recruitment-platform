"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";

import { Button, Field, Textarea } from "@/components/ui";

import { applicantDetailKey } from "../queryKeys";
import { updateApplicantNotes } from "../service";
import type { EmployerApplicantDetail } from "../types";

type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error" };

/**
 * Employer-only private notes panel (spec §14.12, §22.1). These notes are NEVER
 * visible to the candidate. The textarea is explicitly labelled. Saving happens
 * on BLUR (autosave) when the text changed, or via an explicit Save button;
 * either way a success/error message is announced. The notice/error lives in
 * state set only from event/mutation callbacks — never from an effect — to
 * respect the repo's `react-hooks/set-state-in-effect` lint rule.
 */
export function PrivateNotesPanel({
  applicantId,
  initialNotes,
}: {
  applicantId: string;
  initialNotes: string;
}) {
  const t = useTranslations("employer.applicants.notes");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const [value, setValue] = useState(initialNotes);
  const [saved, setSaved] = useState(initialNotes);
  const [state, setState] = useState<SaveState>({ kind: "idle" });

  const mutation = useMutation({
    mutationFn: (notes: string) =>
      updateApplicantNotes(applicantId, notes, locale),
    onMutate() {
      setState({ kind: "saving" });
    },
    onSuccess(detail: EmployerApplicantDetail) {
      queryClient.setQueryData(applicantDetailKey(detail.id), detail);
      setSaved(detail.employer_private_notes);
      setState({ kind: "saved" });
    },
    onError() {
      setState({ kind: "error" });
    },
  });

  const dirty = value !== saved;

  function save() {
    if (!dirty || mutation.isPending) return;
    mutation.mutate(value);
  }

  return (
    <div className="flex flex-col gap-2">
      <Field label={t("label")} hint={t("hint")}>
        <Textarea
          rows={4}
          value={value}
          disabled={mutation.isPending}
          placeholder={t("placeholder")}
          onChange={(event) => {
            setValue(event.target.value);
            if (state.kind !== "idle") setState({ kind: "idle" });
          }}
          onBlur={save}
        />
      </Field>
      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="secondary"
          disabled={!dirty || mutation.isPending}
          onClick={save}
        >
          {state.kind === "saving" ? t("saving") : t("save")}
        </Button>
        {state.kind === "saved" ? (
          <span role="status" className="type-caption text-status-success">
            {t("saved")}
          </span>
        ) : null}
        {state.kind === "error" ? (
          <span role="alert" className="type-caption text-status-danger">
            {t("error")}
          </span>
        ) : null}
      </div>
    </div>
  );
}
