import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/lib/queryClient";

import enCommon from "@/messages/en/common.json";
import enEmployer from "@/messages/en/employer.json";
import enValidation from "@/messages/en/validation.json";

import { EmployerApprovalView } from "./EmployerApprovalView";

const replace = vi.fn();
const getApprovalStatus = vi.fn();
const getEmployerProfile = vi.fn();
const useAuth = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

vi.mock("../service", () => ({
  getApprovalStatus: (...args: unknown[]) => getApprovalStatus(...args),
  getEmployerProfile: (...args: unknown[]) => getEmployerProfile(...args),
}));

vi.mock("@/lib/auth", () => ({
  useAuth: () => useAuth(),
}));

// The editable branches render the form, which is exercised separately; here we
// stub it so the branch tests stay focused on status routing.
vi.mock("./CompanyProfileForm", () => ({
  CompanyProfileForm: ({ submitLabel }: { submitLabel?: string }) => (
    <button type="submit">{submitLabel ?? "Save changes"}</button>
  ),
}));

const messages = {
  common: enCommon,
  employer: enEmployer,
  validation: enValidation,
};

function renderView(ui: ReactElement) {
  const queryClient = createQueryClient();
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

const EMPLOYER = {
  id: "e1",
  email: "hr@acme.example",
  role: "EMPLOYER" as const,
  status: "PENDING" as const,
  preferred_locale: "en",
  is_email_verified: true,
  profile: { approval_status: "PENDING" as const },
};

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

describe("EmployerApprovalView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: EMPLOYER, isLoading: false });
    getEmployerProfile.mockResolvedValue(PROFILE);
  });

  it("renders the pending state with next step and the edit form", async () => {
    getApprovalStatus.mockResolvedValue({
      approval_status: "PENDING",
      approval_reason: null,
      can_publish: false,
      company_name: "Acme Ltd",
      approved_at: null,
      suspended_at: null,
    });

    renderView(<EmployerApprovalView />);

    expect(
      await screen.findByText("Your account is under review"),
    ).toBeInTheDocument();
    expect(screen.getByText("Expected next step")).toBeInTheDocument();
    expect(screen.getByText("Pending approval")).toBeInTheDocument();
    // Editable: the (stubbed) profile form renders the default save action.
    expect(
      await screen.findByRole("button", { name: "Save changes" }),
    ).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });

  it("renders the rejection reason and a resubmit affordance", async () => {
    getApprovalStatus.mockResolvedValue({
      approval_status: "REJECTED",
      approval_reason: "Company registration number could not be verified.",
      can_publish: false,
      company_name: "Acme Ltd",
      approved_at: null,
      suspended_at: null,
    });

    renderView(<EmployerApprovalView />);

    expect(
      await screen.findByText("Registration not approved"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Company registration number could not be verified."),
    ).toBeInTheDocument();
    // Editable + rejected: the resubmit label is passed through to the form.
    expect(
      await screen.findByRole("button", { name: "Update and resubmit" }),
    ).toBeInTheDocument();
  });

  it("renders the suspension notice with no editing affordance", async () => {
    getApprovalStatus.mockResolvedValue({
      approval_status: "SUSPENDED",
      approval_reason: null,
      can_publish: false,
      company_name: "Acme Ltd",
      approved_at: null,
      suspended_at: "2026-06-01T00:00:00Z",
    });

    renderView(<EmployerApprovalView />);

    expect(
      await screen.findByText("Your account is suspended"),
    ).toBeInTheDocument();
    expect(screen.getByText("Account suspended")).toBeInTheDocument();
    // Suspended employers cannot edit restricted data (spec §8.5).
    expect(
      screen.queryByRole("button", { name: /save|resubmit/i }),
    ).not.toBeInTheDocument();
    expect(getEmployerProfile).not.toHaveBeenCalled();
  });

  it("redirects an approved employer to the workspace", async () => {
    getApprovalStatus.mockResolvedValue({
      approval_status: "APPROVED",
      approval_reason: null,
      can_publish: true,
      company_name: "Acme Ltd",
      approved_at: "2026-06-10T00:00:00Z",
      suspended_at: null,
    });

    renderView(<EmployerApprovalView />);

    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/employer/dashboard"),
    );
  });

  it("shows a permission-denied state for a non-employer", async () => {
    useAuth.mockReturnValue({
      user: { ...EMPLOYER, role: "CANDIDATE" },
      isLoading: false,
    });

    renderView(<EmployerApprovalView />);

    expect(
      await screen.findByText("You do not have access"),
    ).toBeInTheDocument();
    expect(getApprovalStatus).not.toHaveBeenCalled();
  });
});
