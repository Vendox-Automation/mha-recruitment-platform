import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createQueryClient } from "@/lib/queryClient";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
}));

import enEmployer from "@/messages/en/employer.json";
import enJobs from "@/messages/en/jobs.json";
import enValidation from "@/messages/en/validation.json";

import { JobForm } from "./JobForm";

const createJob = vi.fn();
const updateJob = vi.fn();

vi.mock("../employerService", () => ({
  createJob: (...args: unknown[]) => createJob(...args),
  updateJob: (...args: unknown[]) => updateJob(...args),
}));

const messages = {
  employer: enEmployer,
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

describe("JobForm", () => {
  beforeEach(() => vi.clearAllMocks());

  it("disables the salary figures when 'do not disclose salary' is checked", async () => {
    const user = userEvent.setup();
    renderForm(<JobForm onSaved={vi.fn()} />);

    const min = screen.getByLabelText("Minimum salary") as HTMLInputElement;
    const max = screen.getByLabelText("Maximum salary") as HTMLInputElement;
    expect(min).not.toBeDisabled();
    expect(max).not.toBeDisabled();

    await user.click(
      screen.getByRole("checkbox", { name: /Do not disclose salary/ }),
    );

    expect(min).toBeDisabled();
    expect(max).toBeDisabled();
  });

  it("adds and removes a screening question", async () => {
    const user = userEvent.setup();
    renderForm(<JobForm onSaved={vi.fn()} />);

    expect(screen.getByText("No screening questions yet.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Add a question" }));
    expect(screen.getByLabelText(/^Question/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove question 1" }));
    expect(screen.getByText("No screening questions yet.")).toBeInTheDocument();
  });

  it("shows option rows only for a SINGLE_CHOICE question", async () => {
    const user = userEvent.setup();
    renderForm(<JobForm onSaved={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Add a question" }));
    expect(screen.queryByText("Answer options")).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByLabelText("Answer type"),
      "SINGLE_CHOICE",
    );
    expect(screen.getByText("Answer options")).toBeInTheDocument();
  });

  it("submits a create payload with disclosed salary dropped to null", async () => {
    const user = userEvent.setup();
    createJob.mockResolvedValue({ id: 7 });
    const onSaved = vi.fn();
    renderForm(<JobForm onSaved={onSaved} />);

    await user.type(screen.getByLabelText(/^Job title/), "Engineer");
    await user.type(screen.getByLabelText(/^Location/), "Kuala Lumpur");
    await user.type(screen.getByLabelText("Minimum salary"), "5000");
    await user.type(screen.getByLabelText("Maximum salary"), "9000");
    await user.click(
      screen.getByRole("checkbox", { name: /Do not disclose salary/ }),
    );
    await user.type(screen.getByLabelText(/^Job description/), "Build things.");
    await user.type(screen.getByLabelText(/^Requirements/), "Experience.");

    await user.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(createJob).toHaveBeenCalledOnce());
    const [payload] = createJob.mock.calls[0];
    expect(payload).toMatchObject({
      title: "Engineer",
      location: "Kuala Lumpur",
      salary_disclosed: false,
      salary_min: null,
      salary_max: null,
    });
    expect(onSaved).toHaveBeenCalledWith({ id: 7 });
  });
});
