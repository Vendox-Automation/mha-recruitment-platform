import { describe, expect, it } from "vitest";

import {
  availableJobActions,
  isJobAdminLocked,
  jobStatusKey,
  jobStatusTone,
} from "./employerStatus";

describe("availableJobActions", () => {
  it("offers Edit + Publish for a DRAFT", () => {
    expect(availableJobActions("DRAFT")).toEqual(["edit", "publish"]);
  });

  it("offers Edit + Close for a PUBLISHED job", () => {
    expect(availableJobActions("PUBLISHED")).toEqual(["edit", "close"]);
  });

  it("offers Edit + Reopen for a CLOSED job", () => {
    expect(availableJobActions("CLOSED")).toEqual(["edit", "reopen"]);
  });

  it("offers no lifecycle actions for a SUSPENDED job (admin-locked)", () => {
    expect(availableJobActions("SUSPENDED")).toEqual([]);
  });

  it("offers only Edit for EXPIRED and ARCHIVED", () => {
    expect(availableJobActions("EXPIRED")).toEqual(["edit"]);
    expect(availableJobActions("ARCHIVED")).toEqual(["edit"]);
  });
});

describe("isJobAdminLocked", () => {
  it("is true only for SUSPENDED", () => {
    expect(isJobAdminLocked("SUSPENDED")).toBe(true);
    expect(isJobAdminLocked("PUBLISHED")).toBe(false);
    expect(isJobAdminLocked("DRAFT")).toBe(false);
  });
});

describe("jobStatusKey / jobStatusTone", () => {
  it("maps each status to its i18n key", () => {
    expect(jobStatusKey("DRAFT")).toBe("draft");
    expect(jobStatusKey("PUBLISHED")).toBe("published");
    expect(jobStatusKey("SUSPENDED")).toBe("suspended");
  });

  it("gives PUBLISHED a success tone and SUSPENDED a danger tone", () => {
    expect(jobStatusTone("PUBLISHED")).toBe("success");
    expect(jobStatusTone("SUSPENDED")).toBe("danger");
  });
});
