import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

import enCommon from "@/messages/en/common.json";
import enAdmin from "@/messages/en/admin.json";

import { RejectEmployerDialog } from "./RejectEmployerDialog";

const messages = { common: enCommon, admin: enAdmin };

function renderDialog(ui: ReactElement) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      {ui}
    </NextIntlClientProvider>,
  );
}

describe("RejectEmployerDialog", () => {
  it("renders nothing when closed", () => {
    renderDialog(
      <RejectEmployerDialog
        open={false}
        companyName="Acme Ltd"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("is a labelled modal naming the target company", () => {
    renderDialog(
      <RejectEmployerDialog
        open
        companyName="Acme Ltd"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText(/Acme Ltd/)).toBeInTheDocument();
  });

  it("blocks submission and shows a validation message when the reason is empty", async () => {
    const onConfirm = vi.fn();
    renderDialog(
      <RejectEmployerDialog
        open
        companyName="Acme Ltd"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Reject employer" }),
    );
    expect(onConfirm).not.toHaveBeenCalled();
    expect(
      screen.getByText("A reason is required to reject an employer."),
    ).toBeInTheDocument();
  });

  it("submits the trimmed reason when provided", async () => {
    const onConfirm = vi.fn();
    renderDialog(
      <RejectEmployerDialog
        open
        companyName="Acme Ltd"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />,
    );
    await userEvent.type(
      screen.getByLabelText(/Reason for rejection/),
      "  Cannot verify registration  ",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Reject employer" }),
    );
    expect(onConfirm).toHaveBeenCalledWith("Cannot verify registration");
  });

  it("cancels on Escape", async () => {
    const onCancel = vi.fn();
    renderDialog(
      <RejectEmployerDialog
        open
        companyName="Acme Ltd"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(onCancel).toHaveBeenCalled());
  });

  it("surfaces a server error inline", () => {
    renderDialog(
      <RejectEmployerDialog
        open
        companyName="Acme Ltd"
        serverError="This employer cannot be rejected from its current state."
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(
      screen.getByText(
        "This employer cannot be rejected from its current state.",
      ),
    ).toBeInTheDocument();
  });
});
