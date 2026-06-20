"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocale, useTranslations } from "next-intl";
import { useId, useRef, useState } from "react";

import {
  Alert,
  Button,
  Card,
  ErrorState,
  LoadingState,
  SuccessState,
} from "@/components/ui";
import { ApiRequestError } from "@/lib/api/client";

import { formatDate } from "../format";
import { CANDIDATE_DASHBOARD_KEY, CANDIDATE_PROFILE_KEY } from "../queryKeys";
import {
  precheckResumeFile,
  RESUME_ACCEPT,
  type ResumePrecheckError,
} from "../resumeFile";
import { deleteResume, getProfile, resumeDownloadUrl, uploadResume } from "../service";

const RESUME_QUERY_KEY = CANDIDATE_PROFILE_KEY;

type Notice =
  | { kind: "uploaded" }
  | { kind: "replaced" }
  | { kind: "removed" }
  | null;

/**
 * Resume manager (spec §14.9 E, §22.2). Loads the profile for the current resume
 * metadata, then offers upload / replace / remove. The file is validated
 * client-side (type + 5 MB) for a fast friendly message BEFORE any upload, but
 * the server stays authoritative — its `validation_error` (field `file`) is
 * surfaced verbatim.
 *
 * Retrieval is a top-level link to the permission-checked download endpoint
 * (new tab); NO public file URL is constructed (ADR-0001 §5). All five required
 * states are present: loading, empty (no resume), error (retry), success
 * (notice), and the in-flight disabled controls.
 */
export function ResumeManager() {
  const t = useTranslations("candidate.resume");
  const tv = useTranslations("validation");
  const tCommon = useTranslations("common.states");
  const locale = useLocale();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputId = useId();
  const [clientError, setClientError] = useState<ResumePrecheckError | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  const profileQuery = useQuery({
    queryKey: RESUME_QUERY_KEY,
    queryFn: () => getProfile(locale),
  });

  function resetMessages() {
    setClientError(null);
    setServerError(null);
    setNotice(null);
  }

  function clearFileInput() {
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const hadResume = Boolean(profileQuery.data?.has_resume);

  const upload = useMutation({
    mutationFn: (file: File) => uploadResume(file, locale),
    onSuccess: async () => {
      clearFileInput();
      setNotice({ kind: hadResume ? "replaced" : "uploaded" });
      await queryClient.invalidateQueries({ queryKey: CANDIDATE_PROFILE_KEY });
      await queryClient.invalidateQueries({ queryKey: CANDIDATE_DASHBOARD_KEY });
    },
    onError: (error: unknown) => {
      clearFileInput();
      if (error instanceof ApiRequestError) {
        const fieldMessage = error.fields?.file?.join(" ");
        setServerError(fieldMessage || error.message || tv("generic"));
      } else {
        setServerError(tv("generic"));
      }
    },
  });

  const remove = useMutation({
    mutationFn: () => deleteResume(locale),
    onSuccess: async () => {
      setConfirmingRemove(false);
      setNotice({ kind: "removed" });
      await queryClient.invalidateQueries({ queryKey: CANDIDATE_PROFILE_KEY });
      await queryClient.invalidateQueries({ queryKey: CANDIDATE_DASHBOARD_KEY });
    },
    onError: () => {
      setConfirmingRemove(false);
      setServerError(tCommon("errorDescription"));
    },
  });

  function onFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
    resetMessages();
    const file = event.target.files?.[0];
    if (!file) return;
    const result = precheckResumeFile(file);
    if (!result.ok) {
      setClientError(result.error);
      clearFileInput();
      return;
    }
    upload.mutate(file);
  }

  if (profileQuery.isLoading) {
    return (
      <Card>
        <LoadingState
          title={tCommon("loadingTitle")}
          description={tCommon("loadingDescription")}
          spinnerLabel={tCommon("loadingSpinner")}
        />
      </Card>
    );
  }

  if (profileQuery.isError || !profileQuery.data) {
    return (
      <Card>
        <ErrorState
          title={tCommon("errorTitle")}
          description={tCommon("errorDescription")}
          action={
            <button
              type="button"
              className="type-body-sm font-semibold text-brand-primary hover:underline"
              onClick={() => profileQuery.refetch()}
            >
              {tCommon("retry")}
            </button>
          }
        />
      </Card>
    );
  }

  const profile = profileQuery.data;
  const uploaded = formatDate(profile.resume_uploaded_at, locale);
  const busy = upload.isPending || remove.isPending;
  const noticeCopy =
    notice?.kind === "uploaded"
      ? t("notice.uploaded")
      : notice?.kind === "replaced"
        ? t("notice.replaced")
        : notice?.kind === "removed"
          ? t("notice.removed")
          : null;

  return (
    <Card className="flex flex-col gap-6">
      <p className="type-body-sm text-text-secondary">{t("privacyNote")}</p>

      {noticeCopy ? (
        <SuccessState compact title={t("notice.savedTitle")} description={noticeCopy} />
      ) : null}
      {clientError ? <Alert tone="danger">{tv(clientError)}</Alert> : null}
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

      {profile.has_resume ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border-default bg-surface-subtle p-4">
          <span className="type-label text-text-primary">{t("current")}</span>
          <span className="type-body font-medium text-text-primary">
            {profile.resume_original_name || t("unnamedFile")}
          </span>
          {uploaded ? (
            <span className="type-caption">{t("uploadedOn", { date: uploaded })}</span>
          ) : null}
          <div className="mt-1">
            <a
              href={resumeDownloadUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="type-body-sm font-semibold text-brand-primary hover:underline"
            >
              {t("download")}
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface-canvas p-6 text-center">
          <p className="type-body font-medium text-text-primary">
            {t("emptyTitle")}
          </p>
          <p className="type-body-sm mt-1 text-text-secondary">{t("emptyBody")}</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <label htmlFor={fileInputId} className="type-label text-text-primary">
          {profile.has_resume ? t("replaceLabel") : t("uploadLabel")}
        </label>
        <p id={`${fileInputId}-hint`} className="type-caption">
          {t("inputHint")}
        </p>
        <input
          ref={fileInputRef}
          id={fileInputId}
          type="file"
          accept={RESUME_ACCEPT}
          aria-describedby={`${fileInputId}-hint`}
          disabled={busy}
          onChange={onFileSelected}
          className="block w-full max-w-md text-sm text-text-secondary file:mr-4 file:rounded-md file:border file:border-border-strong file:bg-surface-canvas file:px-4 file:py-2 file:text-sm file:font-semibold file:text-text-primary hover:file:bg-surface-subtle disabled:cursor-not-allowed disabled:opacity-70"
        />
        {upload.isPending ? (
          <p className="type-caption" role="status">
            {t("uploading")}
          </p>
        ) : null}
      </div>

      {profile.has_resume ? (
        <div className="border-t border-border-default pt-4">
          {confirmingRemove ? (
            <div className="flex flex-col gap-3">
              <p className="type-body-sm text-text-secondary">
                {t("removeConfirmBody")}
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="danger"
                  size="sm"
                  disabled={busy}
                  onClick={() => remove.mutate()}
                >
                  {remove.isPending ? t("removing") : t("removeConfirm")}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  onClick={() => setConfirmingRemove(false)}
                >
                  {t("removeCancel")}
                </Button>
              </div>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                resetMessages();
                setConfirmingRemove(true);
              }}
            >
              {t("remove")}
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}
