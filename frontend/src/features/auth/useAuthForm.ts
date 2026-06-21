"use client";

import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiRequestError } from "@/lib/api/client";

/**
 * Localisation hooks for {@link applyApiError}. gettext is unavailable on the
 * backend for these envelopes, so the FRONTEND localises server errors
 * (Phase 11 L-B2): a zh-CN user must never see an English server `message`.
 *
 * - `byCode` resolves a localised generic message from the envelope `code`
 *   (validation_error, authentication_required, …). Wire it to
 *   `common.apiErrors.<code>` in both locales.
 * - `invalidCredentials` is the contextually-correct sign-in failure copy
 *   ("The email or password is incorrect") shown on a 400 login.
 * - `emailExists` is the duplicate-account copy ("An account with this email
 *   already exists") shown on the email field when the server flags it.
 *
 * All are optional so existing callers (and the unit test) keep the original
 * positional behaviour: with no localiser the raw English envelope is used.
 */
export interface ApiErrorLocalizer {
  byCode?: (code: string) => string;
  invalidCredentials?: string;
  emailExists?: string;
}

/**
 * Maps a thrown {@link ApiRequestError} onto a react-hook-form, returning the
 * form-level message to display (spec §11.6 transparent validation; ADR-0001
 * §7.2 error envelope `{code, message, fields}`).
 *
 * Field-level errors from `error.fields` are attached to the matching inputs
 * via `setError`; any unrecognised field is folded into the form-level message
 * so nothing is silently dropped. Non-API errors fall back to a generic
 * message the caller passes in.
 *
 * When a {@link ApiErrorLocalizer} is supplied, the displayed text is derived
 * from the envelope `code` (and the auth-specific special cases) instead of the
 * raw English server `message`, so the zh-CN UI is fully localised. Client-side
 * zod messages are untouched — they are already localised by the caller.
 *
 * @returns the form-level error string, or null if everything mapped to fields.
 */
export function applyApiError<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  knownFields: readonly Path<TValues>[],
  fallbackMessage: string,
  localize?: ApiErrorLocalizer,
): string | null {
  if (!(error instanceof ApiRequestError)) {
    return fallbackMessage;
  }

  // A 400 on a sign-in attempt is the credentials-incorrect case. The backend
  // usually phrases it as a `non_field_errors` message; we prefer the
  // contextual localised copy over the raw English string.
  if (localize?.invalidCredentials && isCredentialsError(error)) {
    return localize.invalidCredentials;
  }

  let unmappedField = false;
  if (error.fields) {
    for (const [field, messages] of Object.entries(error.fields)) {
      const localized = localizeFieldMessage(field, messages, localize);
      if (knownFields.includes(field as Path<TValues>)) {
        setError(field as Path<TValues>, { type: "server", message: localized });
      } else {
        unmappedField = true;
      }
    }
  }

  // Show the form-level message when there is a top-level reason, an unmapped
  // field error (e.g. non_field_errors), or no field detail at all.
  const hasFieldDetail = error.fields && Object.keys(error.fields).length > 0;
  if (!hasFieldDetail || unmappedField) {
    return formLevelMessage(error, fallbackMessage, localize);
  }
  return null;
}

/** A 400 with no usable field detail on a login = invalid credentials. */
function isCredentialsError(error: ApiRequestError): boolean {
  if (error.status !== 400) return false;
  const fieldKeys = error.fields ? Object.keys(error.fields) : [];
  // Treat a bare 400, or one that only carries non_field_errors, as a
  // credentials failure. A field-specific 400 (e.g. bad email format) is left
  // to normal field mapping.
  return fieldKeys.length === 0 || fieldKeys.every((k) => k === "non_field_errors");
}

/** Localise a single field's joined messages (email-exists special case). */
function localizeFieldMessage(
  field: string,
  messages: string[],
  localize?: ApiErrorLocalizer,
): string {
  if (field === "email" && localize?.emailExists && looksLikeDuplicate(messages)) {
    return localize.emailExists;
  }
  return messages.join(" ");
}

/** Heuristic for the duplicate-account server message (locale-agnostic). */
function looksLikeDuplicate(messages: string[]): boolean {
  return messages.some((m) =>
    /already|exist|registered|taken|unique|已|存在|注册/i.test(m),
  );
}

/** Resolve the form-level message, preferring localised code copy. */
function formLevelMessage(
  error: ApiRequestError,
  fallbackMessage: string,
  localize?: ApiErrorLocalizer,
): string {
  if (localize?.byCode) {
    return localize.byCode(error.code);
  }
  return error.message || fallbackMessage;
}

/** Small helper holding the current form-level error message + setter. */
export function useFormError() {
  const [formError, setFormError] = useState<string | null>(null);
  return { formError, setFormError };
}

/** The envelope codes we localise (others fall back to the generic message). */
const KNOWN_API_ERROR_CODES = new Set([
  "validation_error",
  "authentication_required",
  "permission_denied",
  "not_found",
  "conflict",
  "throttled",
  "server_error",
]);

/**
 * Build a locale-aware {@link ApiErrorLocalizer} from the `common.apiErrors`
 * catalogue. Forms pass the result to {@link applyApiError} so server errors
 * render in the active locale (L-B2). `includeAuthCopy` adds the sign-in /
 * duplicate-email contextual copy used by the auth and register flows.
 */
export function useApiErrorLocalizer(
  options: { includeAuthCopy?: boolean } = {},
): ApiErrorLocalizer {
  const t = useTranslations("common.apiErrors");
  const { includeAuthCopy = false } = options;

  return useMemo<ApiErrorLocalizer>(
    () => ({
      byCode: (code: string) =>
        t(KNOWN_API_ERROR_CODES.has(code) ? code : "generic"),
      invalidCredentials: includeAuthCopy ? t("invalidCredentials") : undefined,
      emailExists: includeAuthCopy ? t("emailExists") : undefined,
    }),
    [t, includeAuthCopy],
  );
}
