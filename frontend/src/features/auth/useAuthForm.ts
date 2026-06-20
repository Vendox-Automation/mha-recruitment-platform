"use client";

import { useState } from "react";
import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiRequestError } from "@/lib/api/client";

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
 * @returns the form-level error string, or null if everything mapped to fields.
 */
export function applyApiError<TValues extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<TValues>,
  knownFields: readonly Path<TValues>[],
  fallbackMessage: string,
): string | null {
  if (!(error instanceof ApiRequestError)) {
    return fallbackMessage;
  }

  let unmappedField = false;
  if (error.fields) {
    for (const [field, messages] of Object.entries(error.fields)) {
      const message = messages.join(" ");
      if (knownFields.includes(field as Path<TValues>)) {
        setError(field as Path<TValues>, { type: "server", message });
      } else {
        unmappedField = true;
      }
    }
  }

  // Show the envelope message when there is a top-level reason, an unmapped
  // field error (e.g. non_field_errors), or no field detail at all.
  const hasFieldDetail = error.fields && Object.keys(error.fields).length > 0;
  if (!hasFieldDetail || unmappedField) {
    return error.message || fallbackMessage;
  }
  return null;
}

/** Small helper holding the current form-level error message + setter. */
export function useFormError() {
  const [formError, setFormError] = useState<string | null>(null);
  return { formError, setFormError };
}
