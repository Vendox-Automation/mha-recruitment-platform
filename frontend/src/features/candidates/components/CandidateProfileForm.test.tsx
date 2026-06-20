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

import enCandidate from "@/messages/en/candidate.json";
import enCommon from "@/messages/en/common.json";
import enJobs from "@/messages/en/jobs.json";
import enValidation from "@/messages/en/validation.json";

import { CandidateProfileForm } from "./CandidateProfileForm";
import type { CandidateProfile } from "../types";

const updateProfile = vi.fn();

vi.mock("../service", () => ({
  updateProfile: (...args: unknown[]) => updateProfile(...args),
}));

const messages = {
  candidate: enCandidate,
  common: enCommon,
  jobs: enJobs,
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

const PROFILE: CandidateProfile = {
  full_name: "Jamie Doe",
  phone: "+44 20 7946 0000",
  preferred_job_title: "Site Engineer",
  preferred_location: "",
  preferred_employment_type: "",
  has_resume: false,
  resume_original_name: "",
  resume_uploaded_at: null,
  resume_parsing_status: "NONE",
  profile_completion: { percent: 50, complete: false, items: [], missing: [] },
  updated_at: "2026-06-01T00:00:00Z",
};

describe("CandidateProfileForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("PATCHes editable fields and shows success, never sending resume fields", async () => {
    const user = userEvent.setup();
    updateProfile.mockResolvedValue(PROFILE);

    renderForm(<CandidateProfileForm profile={PROFILE} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledOnce());
    const [payload] = updateProfile.mock.calls[0];
    expect(payload).not.toHaveProperty("has_resume");
    expect(payload).not.toHaveProperty("resume_original_name");
    expect(payload).toMatchObject({ full_name: "Jamie Doe" });

    expect(await screen.findByText("Profile saved")).toBeInTheDocument();
  });

  it("maps an API field error onto the matching input", async () => {
    const user = userEvent.setup();
    updateProfile.mockRejectedValue(
      new ApiRequestError({
        code: "validation_error",
        message: "Please review the highlighted fields.",
        fields: { phone: ["Enter a valid phone number."] },
        status: 400,
      }),
    );

    renderForm(<CandidateProfileForm profile={PROFILE} />);

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("Enter a valid phone number."),
    ).toBeInTheDocument();
  });

  it("blocks submission and shows a client error when a required field is cleared", async () => {
    const user = userEvent.setup();

    renderForm(<CandidateProfileForm profile={PROFILE} />);

    await user.clear(screen.getByLabelText(/Full name/));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(
      await screen.findByText("This field is required."),
    ).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
