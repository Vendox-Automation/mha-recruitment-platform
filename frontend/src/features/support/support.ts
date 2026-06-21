/**
 * Pure mapping between the backend support enums and the i18n key suffixes used
 * in the `support` / candidate `support` namespaces. Kept separate from the
 * components so it can be unit-tested without the UI tree.
 */

import type { BadgeTone } from "@/components/ui";

import type { SupportCategory, SupportStatus } from "./types";

/**
 * Backend `SupportCategory` value → the existing `support.form.categories.*` key
 * suffix. Kept as an explicit map so the select options and the history list read
 * against the same labels, and the (shorter) i18n keys can stay stable.
 */
const CATEGORY_KEY: Record<SupportCategory, string> = {
  JOB_APPLICATION: "application",
  RESUME: "resume",
  CAREER_DIRECTION: "career",
  APPLICATION_STATUS: "status",
  OTHER: "other",
};

/** The categories offered in the form, in display order. */
export const SUPPORT_CATEGORIES: readonly SupportCategory[] = [
  "JOB_APPLICATION",
  "RESUME",
  "CAREER_DIRECTION",
  "APPLICATION_STATUS",
  "OTHER",
] as const;

/** `support.form.categories.<suffix>` key for a category value. */
export function categoryKey(category: SupportCategory): string {
  return CATEGORY_KEY[category] ?? "other";
}

/** Badge tone for a support request status (colour is never the only cue). */
const STATUS_TONE: Record<SupportStatus, BadgeTone> = {
  NEW: "info",
  IN_PROGRESS: "brand",
  RESOLVED: "success",
  CLOSED: "neutral",
};

export function statusTone(status: SupportStatus): BadgeTone {
  return STATUS_TONE[status] ?? "neutral";
}
