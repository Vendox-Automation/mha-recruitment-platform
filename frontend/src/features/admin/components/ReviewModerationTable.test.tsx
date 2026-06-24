import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/lib/queryClient";
import type { AdminReviewListItem, Paginated } from "@/features/reviews/types";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

const getAdminReviews = vi.fn();
const deleteAdminReview = vi.fn();
const deleteAdminReviewReply = vi.fn();
vi.mock("@/features/reviews/service", () => ({
  getAdminReviews: (...args: unknown[]) => getAdminReviews(...args),
  deleteAdminReview: (...args: unknown[]) => deleteAdminReview(...args),
  deleteAdminReviewReply: (...args: unknown[]) => deleteAdminReviewReply(...args),
}));

import enAdmin from "@/messages/en/admin.json";
import enCommon from "@/messages/en/common.json";

import { ReviewModerationTable } from "./ReviewModerationTable";

const messages = { admin: enAdmin, common: enCommon };

function renderTable(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

function page(results: AdminReviewListItem[]): Paginated<AdminReviewListItem> {
  return { count: results.length, next: null, previous: null, results };
}

const review: AdminReviewListItem = {
  id: 42,
  company_name: "Acme Ltd",
  reviewer_name: "Jordan",
  reviewer_email: "jordan@example.com",
  rating: 2,
  title: "Mixed",
  body: "Some concerns about the process.",
  created_at: "2026-06-01T00:00:00Z",
  has_reply: false,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReviewModerationTable", () => {
  it("lists reviews and confirms a review deletion through the dialog", async () => {
    getAdminReviews.mockResolvedValue(page([review]));
    deleteAdminReview.mockResolvedValue(undefined);

    renderTable(<ReviewModerationTable />);

    // Row renders once the query resolves.
    expect(await screen.findByText("Acme Ltd")).toBeInTheDocument();

    // Open the confirm dialog.
    await userEvent.click(
      screen.getByRole("button", { name: "Delete review" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).getByText(/Jordan/)).toBeInTheDocument();

    // Confirm — the service is called with the review id and feedback shows.
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(deleteAdminReview).toHaveBeenCalledWith(42, expect.anything());
    });
    expect(
      await screen.findByText("The review by Jordan has been deleted."),
    ).toBeInTheDocument();
  });

  it("shows an empty state when no reviews match", async () => {
    getAdminReviews.mockResolvedValue(page([]));
    renderTable(<ReviewModerationTable />);
    expect(await screen.findByText("No reviews match")).toBeInTheDocument();
  });
});
