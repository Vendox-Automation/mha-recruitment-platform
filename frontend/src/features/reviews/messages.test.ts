import { describe, expect, it } from "vitest";

import enReviews from "@/messages/en/reviews.json";
import zhReviews from "@/messages/zh-CN/reviews.json";

/** Collect every leaf key path in a nested message object. */
function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    keyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("reviews i18n parity", () => {
  it("has identical key sets in en and zh-CN", () => {
    const en = keyPaths(enReviews).sort();
    const zh = keyPaths(zhReviews).sort();
    expect(zh).toEqual(en);
  });
});
