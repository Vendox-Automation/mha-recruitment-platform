import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "@/lib/api/client";
import { createQueryClient } from "@/lib/queryClient";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

import enCommon from "@/messages/en/common.json";
import enEmployer from "@/messages/en/employer.json";
import enValidation from "@/messages/en/validation.json";

import { CompanyProfileForm } from "./CompanyProfileForm";

const updateEmployerProfile = vi.fn();
const refetch = vi.fn().mockResolvedValue(undefined);

vi.mock("../service", () => ({
  updateEmployerProfile: (...args: unknown[]) => updateEmployerProfile(...args),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ refetch }),
}));

const messages = {
  common: enCommon,
  employer: enEmployer,
  validation: enValidation,
};

function renderForm(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const PROFILE = {
  company_name: "Acme Ltd",
  contact_person: "Jamie Doe",
  phone: "+44 20 7946 0000",
  company_summary: "",
  website: "",
  industry: "",
  company_size: "",
  company_location: "",
  culture_text: "",
  benefits_text: "",
  approval_status: "PENDING" as const,
  approval_reason: null,
  approved_at: null,
  suspended_at: null,
};

describe("CompanyProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCHes allowed fields and shows a success state, never sending approval fields", async () => {
    const user = userEvent.setup();
    updateEmployerProfile.mockResolvedValue(PROFILE);

    renderForm(<CompanyProfileForm profile={PROFILE} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateEmployerProfile).toHaveBeenCalledOnce());
    const [payload] = updateEmployerProfile.mock.calls[0];
    // Approval lifecycle fields must never be sent (Django owns approval).
    expect(payload).not.toHaveProperty("approval_status");
    expect(payload).not.toHaveProperty("approval_reason");
    expect(payload).toMatchObject({ company_name: "Acme Ltd" });

    expect(await screen.findByText("Company profile saved")).toBeInTheDocument();
    expect(refetch).toHaveBeenCalled();
  });

  it("maps API field errors onto the matching inputs", async () => {
    const user = userEvent.setup();
    updateEmployerProfile.mockRejectedValue(
      new ApiRequestError({
        code: "validation_error",
        message: "Please review the highlighted fields.",
        fields: { website: ["Enter a valid URL."] },
        status: 400,
      }),
    );

    renderForm(<CompanyProfileForm profile={PROFILE} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Enter a valid URL.")).toBeInTheDocument();
  });

  it("blocks submission and shows a client validation error for a malformed website", async () => {
    const user = userEvent.setup();

    renderForm(<CompanyProfileForm profile={PROFILE} />);

    await user.type(screen.getByLabelText("Website"), "acme.example");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText(
        "Enter a full URL starting with http:// or https://.",
      ),
    ).toBeInTheDocument();
    expect(updateEmployerProfile).not.toHaveBeenCalled();
  });
});
