/**
 * Perspective primitives shared by the homepage (spec §13.3, §5.2).
 *
 * This module is intentionally NOT a client module: the pure type, the list,
 * and the parser are imported by BOTH the server homepage (to seed the initial
 * perspective from `?view=`) and the client `PerspectiveContext`. Keeping these
 * here avoids importing a client-only module from a Server Component (which is
 * an RSC-boundary error).
 */

export type Perspective = "candidate" | "employer";

export const PERSPECTIVES: readonly Perspective[] = [
  "candidate",
  "employer",
] as const;

/** Parse a perspective from a raw string, or `null` when it is not valid. */
export function parsePerspective(
  value: string | null | undefined,
): Perspective | null {
  return value === "candidate" || value === "employer" ? value : null;
}
