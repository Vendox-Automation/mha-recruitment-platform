import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/lib/queryClient";
import { ApiRequestError } from "@/lib/api/client";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

const createCompanyReview = vi.fn();
vi.mock("../service", () => ({
  createCompanyReview: (...args: unknown[]) => createCompanyReview(...args),
}));

import enReviews from "@/messages/en/reviews.json";
import enValidation from "@/messages/en/validation.json";
import enCommon from "@/messages/en/common.json";

import { ReviewForm } from "./ReviewForm";

const messages = {
  reviews: enReviews,
  validation: enValidation,
  common: enCommon,
};

function renderForm(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ReviewForm", () => {
  it("requires name, email, and a rating before submitting", async () => {
    renderForm(<ReviewForm companySlug="acme" />);
    await userEvent.click(screen.getByRole("button", { name: "Post review" }));

    // The required messages appear and the service is never called.
    await waitFor(() => {
      expect(screen.getAllByText("This field is required.").length).toBeGreaterThan(
        0,
      );
    });
    expect(createCompanyReview).not.toHaveBeenCalled();
  });

  it("submits a valid review and shows the confirmation", async () => {
    createCompanyReview.mockResolvedValue({
      id: 1,
      reviewer_name: "Jo",
      rating: 5,
      title: "",
      body: "",
      created_at: "2026-06-01T00:00:00Z",
      reply: null,
    });
    const onSubmitted = vi.fn();
    renderForm(<ReviewForm companySlug="acme" onSubmitted={onSubmitted} />);

    await userEvent.type(screen.getByLabelText(/Your name/), "Jo");
    await userEvent.type(screen.getByLabelText(/^Email/), "jo@example.com");
    await userEvent.click(screen.getByRole("radio", { name: "5 out of 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Post review" }));

    await waitFor(() => {
      expect(createCompanyReview).toHaveBeenCalledWith(
        "acme",
        expect.objectContaining({
          reviewer_name: "Jo",
          reviewer_email: "jo@example.com",
          rating: 5,
        }),
        expect.anything(),
      );
    });
    expect(onSubmitted).toHaveBeenCalled();
    expect(
      await screen.findByText("Thank you for your review"),
    ).toBeInTheDocument();
  });

  it("surfaces a friendly message when throttled (429)", async () => {
    createCompanyReview.mockRejectedValue(
      new ApiRequestError({
        code: "throttled",
        message: "Throttled.",
        status: 429,
      }),
    );
    renderForm(<ReviewForm companySlug="acme" />);

    await userEvent.type(screen.getByLabelText(/Your name/), "Jo");
    await userEvent.type(screen.getByLabelText(/^Email/), "jo@example.com");
    await userEvent.click(screen.getByRole("radio", { name: "4 out of 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Post review" }));

    expect(
      await screen.findByText(
        "You have posted a review recently. Please try again later.",
      ),
    ).toBeInTheDocument();
  });

  it("maps a 400 field error onto the email input", async () => {
    createCompanyReview.mockRejectedValue(
      new ApiRequestError({
        code: "validation_error",
        message: "Invalid.",
        status: 400,
        fields: { reviewer_email: ["Enter a valid email address."] },
      }),
    );
    renderForm(<ReviewForm companySlug="acme" />);

    await userEvent.type(screen.getByLabelText(/Your name/), "Jo");
    await userEvent.type(screen.getByLabelText(/^Email/), "jo@example.com");
    await userEvent.click(screen.getByRole("radio", { name: "3 out of 5" }));
    await userEvent.click(screen.getByRole("button", { name: "Post review" }));

    expect(
      await screen.findByText("Enter a valid email address."),
    ).toBeInTheDocument();
  });
});
