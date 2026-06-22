import { describe, expect, it } from "vitest";

import enAdmin from "@/messages/en/admin.json";
import zhAdmin from "@/messages/zh-CN/admin.json";

import {
  actionsForStatus,
  ALL_EMPLOYER_STATUSES,
  STATUS_FILTERS,
  statusLabelKey,
  statusTone,
} from "./status";
import type { AdminEmployerStatus } from "./types";

describe("employer status mapping", () => {
  it("offers an All filter plus every concrete status", () => {
    expect(STATUS_FILTERS[0]).toBe("ALL");
    for (const status of ALL_EMPLOYER_STATUSES) {
      expect(STATUS_FILTERS).toContain(status);
    }
  });

  it("never colours REJECTED as success or blame (stays neutral)", () => {
    expect(statusTone("REJECTED")).toBe("neutral");
    expect(statusTone("APPROVED")).toBe("success");
    expect(statusTone("PENDING")).toBe("warning");
    expect(statusTone("SUSPENDED")).toBe("danger");
  });

  it("maps allowed actions per the lifecycle", () => {
    expect(actionsForStatus("PENDING")).toEqual(["approve", "reject"]);
    expect(actionsForStatus("REJECTED")).toEqual(["approve"]);
    expect(actionsForStatus("APPROVED")).toEqual(["suspend"]);
    expect(actionsForStatus("SUSPENDED")).toEqual(["restore"]);
  });

  it("never offers reject outside PENDING", () => {
    for (const status of ALL_EMPLOYER_STATUSES) {
      if (status === "PENDING") continue;
      expect(actionsForStatus(status)).not.toContain("reject");
    }
  });

  it("has a label for every status in BOTH locales", () => {
    const en = enAdmin.status as Record<AdminEmployerStatus, string>;
    const zh = zhAdmin.status as Record<AdminEmployerStatus, string>;
    for (const status of ALL_EMPLOYER_STATUSES) {
      expect(statusLabelKey(status)).toBe(`status.${status}`);
      expect(en[status]).toBeTruthy();
      expect(zh[status]).toBeTruthy();
    }
  });
});
