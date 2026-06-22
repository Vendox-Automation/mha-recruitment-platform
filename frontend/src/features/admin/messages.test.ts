import { describe, expect, it } from "vitest";

import enAdmin from "@/messages/en/admin.json";
import zhAdmin from "@/messages/zh-CN/admin.json";

/** Collect every leaf key path in a nested message object. */
function keyPaths(obj: unknown, prefix = ""): string[] {
  if (obj === null || typeof obj !== "object") return [prefix];
  return Object.entries(obj as Record<string, unknown>).flatMap(([key, value]) =>
    keyPaths(value, prefix ? `${prefix}.${key}` : key),
  );
}

describe("admin i18n parity", () => {
  it("has identical key sets in en and zh-CN", () => {
    const en = keyPaths(enAdmin).sort();
    const zh = keyPaths(zhAdmin).sort();
    expect(zh).toEqual(en);
  });
});
