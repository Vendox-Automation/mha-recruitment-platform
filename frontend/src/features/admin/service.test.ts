import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/lib/api/client";

import {
  approveEmployer,
  buildEmployersQuery,
  getAdminEmployer,
  getAdminEmployers,
  getAdminSummary,
  rejectEmployer,
  restoreEmployer,
  suspendEmployer,
} from "./service";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn().mockResolvedValue({}),
}));

const mockedFetch = vi.mocked(apiFetch);

afterEach(() => {
  vi.clearAllMocks();
});

describe("buildEmployersQuery", () => {
  it("omits the ALL status, empty search, and page 1 (clean default URL)", () => {
    expect(buildEmployersQuery()).toBe("");
    expect(buildEmployersQuery({ status: "ALL", search: "", page: 1 })).toBe("");
  });

  it("includes a concrete status filter", () => {
    expect(buildEmployersQuery({ status: "PENDING" })).toBe("?status=PENDING");
  });

  it("trims and includes a search term", () => {
    expect(buildEmployersQuery({ search: "  acme  " })).toBe("?search=acme");
  });

  it("includes page only beyond the first", () => {
    expect(buildEmployersQuery({ page: 2 })).toBe("?page=2");
  });

  it("combines status, search, and page", () => {
    const qs = buildEmployersQuery({
      status: "SUSPENDED",
      search: "beta",
      page: 3,
    });
    expect(qs).toContain("status=SUSPENDED");
    expect(qs).toContain("search=beta");
    expect(qs).toContain("page=3");
  });
});

describe("admin service paths", () => {
  it("requests the summary", async () => {
    await getAdminSummary("en");
    expect(mockedFetch).toHaveBeenCalledWith("/admin/summary/", {
      method: "GET",
      locale: "en",
    });
  });

  it("builds the employer list path from params", async () => {
    await getAdminEmployers({ status: "PENDING", search: "acme", page: 2 }, "zh-CN");
    expect(mockedFetch).toHaveBeenCalledWith(
      "/admin/employers/?status=PENDING&search=acme&page=2",
      { method: "GET", locale: "zh-CN" },
    );
  });

  it("encodes the id in the detail path", async () => {
    await getAdminEmployer("a b", "en");
    expect(mockedFetch).toHaveBeenCalledWith("/admin/employers/a%20b/", {
      method: "GET",
      locale: "en",
    });
  });

  it("posts approve / suspend / restore without a body", async () => {
    await approveEmployer(1, "en");
    await suspendEmployer(2, "en");
    await restoreEmployer(3, "en");
    expect(mockedFetch).toHaveBeenCalledWith("/admin/employers/1/approve/", {
      method: "POST",
      locale: "en",
    });
    expect(mockedFetch).toHaveBeenCalledWith("/admin/employers/2/suspend/", {
      method: "POST",
      locale: "en",
    });
    expect(mockedFetch).toHaveBeenCalledWith("/admin/employers/3/restore/", {
      method: "POST",
      locale: "en",
    });
  });

  it("posts reject with the reason in the body", async () => {
    await rejectEmployer(5, "Cannot verify registration", "en");
    expect(mockedFetch).toHaveBeenCalledWith("/admin/employers/5/reject/", {
      method: "POST",
      body: { reason: "Cannot verify registration" },
      locale: "en",
    });
  });
});
