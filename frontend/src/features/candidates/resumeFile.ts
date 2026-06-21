/**
 * Client-side resume pre-checks (spec §22.2, ADR-0001 §5). These give the
 * candidate a fast, friendly rejection BEFORE an upload starts — but the server
 * stays authoritative (it re-checks extension, size, AND magic bytes; the
 * client's MIME type is attacker-controlled and only used here as a hint).
 *
 * Pure functions so the rules are unit-testable without touching the network.
 */

/** Maximum resume size in bytes (5 MB), matching `settings.RESUME_MAX_BYTES`. */
export const RESUME_MAX_BYTES = 5 * 1024 * 1024;

/** Allowed file extensions (matches `settings.RESUME_ALLOWED_EXTENSIONS`). */
export const RESUME_ALLOWED_EXTENSIONS = ["pdf", "docx"] as const;

/** `accept` attribute for the file input. */
export const RESUME_ACCEPT = ".pdf,.docx";

/** Reason a file failed the pre-check, mapped to a `validation` message key. */
export type ResumePrecheckError = "fileType" | "fileSize";

export interface ResumePrecheckResult {
  ok: boolean;
  /** A `validation` namespace key when `ok` is false, else null. */
  error: ResumePrecheckError | null;
}

/** Lower-cased extension (without the dot) of a filename, or "" if none. */
function extensionOf(name: string): string {
  const dot = name.lastIndexOf(".");
  if (dot < 0 || dot === name.length - 1) return "";
  return name.slice(dot + 1).toLowerCase();
}

/**
 * Validate a candidate-selected file against the resume rules. Type is checked
 * first (a wrong-type file is the more useful message), then size. An empty
 * file is rejected as a type error since it cannot be a real resume.
 */
export function precheckResumeFile(file: File): ResumePrecheckResult {
  const ext = extensionOf(file.name);
  const typeOk = (RESUME_ALLOWED_EXTENSIONS as readonly string[]).includes(ext);
  if (!typeOk) {
    return { ok: false, error: "fileType" };
  }
  if (file.size === 0 || file.size > RESUME_MAX_BYTES) {
    return { ok: false, error: "fileSize" };
  }
  return { ok: true, error: null };
}
