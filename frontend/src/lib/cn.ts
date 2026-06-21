/**
 * Tiny class-name combiner. Filters falsy values and joins with spaces.
 *
 * Built by hand (no `clsx`/`tailwind-merge` dependency) — Phase 1 adds no npm
 * packages. Later duplicate-utility resolution can be layered in if needed; for
 * the design system we author non-conflicting class lists.
 */
export type ClassValue =
  | string
  | number
  | null
  | false
  | undefined
  | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    if (Array.isArray(value)) {
      const nested = cn(...value);
      if (nested) out.push(nested);
    } else {
      out.push(String(value));
    }
  }
  return out.join(" ");
}
