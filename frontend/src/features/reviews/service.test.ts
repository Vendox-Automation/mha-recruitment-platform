import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/lib/api/client";

import {
  buildAdminReviewsQuery,
  buildReviewsQuery,
  createCompanyReview,
  deleteAdminReview,
  deleteAdminReviewReply,
  deleteReviewReply,
  getAdminReviews,
  listCompanyReviews,
  replyToReview,
} from "./service";

vi.mock("@/lib/api/client", () => ({
  apiFetch: vi.fn().mockResolvedValue({}),
}));

const mockedFetch = vi.mocked(apiFetch);

afterEach(() => {
  vi.clearAllMocks();
});

describe("buildReviewsQuery", () => {
  it("omits page 1 and appends ?page= beyond the first", () => {
    expect(buildReviewsQuery()).toBe("");
    expect(buildReviewsQuery(1)).toBe("");
    expect(buildReviewsQuery(3)).toBe("?page=3");
  });
});

describe("buildAdminReviewsQuery", () => {
  it("is empty for the clean default", () => {
    expect(buildAdminReviewsQuery()).toBe("");
    expect(buildAdminReviewsQuery({ company: "", search: "", page: 1 })).toBe("");
  });

  it("trims and includes company + search + page", () => {
    const qs = buildAdminReviewsQuery({
      company: "  Acme  ",
      search: "  great  ",
      page: 2,
    });
    expect(qs).toContain("company=Acme");
    expect(qs).toContain("search=great");
    expect(qs).toContain("page=2");
  });
});

describe("reviews service paths", () => {
  it("lists a company's reviews with an encoded slug", async () => {
    await listCompanyReviews("acme co", 2, "en");
    expect(mockedFetch).toHaveBeenCalledWith(
      "/companies/acme%20co/reviews/?page=2",
      { method: "GET", locale: "en" },
    );
  });

  it("posts a new review in the body", async () => {
    await createCompanyReview(
      "acme",
      {
        reviewer_name: "Jo",
        reviewer_email: "jo@example.com",
        rating: 4,
        title: "Good",
        body: "Nice place",
      },
      "zh-CN",
    );
    expect(mockedFetch).toHaveBeenCalledWith("/companies/acme/reviews/", {
      method: "POST",
      body: {
        reviewer_name: "Jo",
        reviewer_email: "jo@example.com",
        rating: 4,
        title: "Good",
        body: "Nice place",
      },
      locale: "zh-CN",
    });
  });

  it("posts and deletes an employer reply", async () => {
    await replyToReview(7, "Thanks!", "en");
    await deleteReviewReply(7, "en");
    expect(mockedFetch).toHaveBeenCalledWith("/employer/reviews/7/reply/", {
      method: "POST",
      body: { body: "Thanks!" },
      locale: "en",
    });
    expect(mockedFetch).toHaveBeenCalledWith("/employer/reviews/7/reply/", {
      method: "DELETE",
      locale: "en",
    });
  });

  it("builds the admin list path from params", async () => {
    await getAdminReviews({ company: "Acme", search: "good", page: 2 }, "en");
    expect(mockedFetch).toHaveBeenCalledWith(
      "/admin/reviews/?company=Acme&search=good&page=2",
      { method: "GET", locale: "en" },
    );
  });

  it("deletes an admin review and a reply", async () => {
    await deleteAdminReview(5, "en");
    await deleteAdminReviewReply(5, "en");
    expect(mockedFetch).toHaveBeenCalledWith("/admin/reviews/5/", {
      method: "DELETE",
      locale: "en",
    });
    expect(mockedFetch).toHaveBeenCalledWith("/admin/reviews/5/reply/", {
      method: "DELETE",
      locale: "en",
    });
  });
});
