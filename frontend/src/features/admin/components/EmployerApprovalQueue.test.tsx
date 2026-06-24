import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "@/lib/api/client";

import enCommon from "@/messages/en/common.json";
import enAdmin from "@/messages/en/admin.json";

import { EmployerApprovalQueue } from "./EmployerApprovalQueue";
import type {
  AdminEmployerListItem,
  AdminEmployerStatus,
  Paginated,
} from "../types";

const getAdminEmployers = vi.fn();
const approveEmployer = vi.fn();
const rejectEmployer = vi.fn();
const suspendEmployer = vi.fn();
const restoreEmployer = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, href }: { children: ReactNode; href: string }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));

vi.mock("../service", () => ({
  getAdminEmployers: (...args: unknown[]) => getAdminEmployers(...args),
  approveEmployer: (...args: unknown[]) => approveEmployer(...args),
  rejectEmployer: (...args: unknown[]) => rejectEmployer(...args),
  suspendEmployer: (...args: unknown[]) => suspendEmployer(...args),
  restoreEmployer: (...args: unknown[]) => restoreEmployer(...args),
}));

const messages = { common: enCommon, admin: enAdmin };

function renderQueue(ui: ReactElement) {
  // Retries off so an error surfaces immediately and deterministically.
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

function employer(
  overrides: Partial<AdminEmployerListItem> = {},
): AdminEmployerListItem {
  return {
    id: "e1",
    company_name: "Acme Ltd",
    contact_person: "Jamie Doe",
    email: "hr@acme.example",
    approval_status: "PENDING" as AdminEmployerStatus,
    industry: "Logistics",
    company_location: "Manchester",
    created_at: "2026-06-01T00:00:00Z",
    approved_at: null,
    suspended_at: null,
    ...overrides,
  };
}

function page(
  results: AdminEmployerListItem[],
  extra: Partial<Paginated<AdminEmployerListItem>> = {},
): Paginated<AdminEmployerListItem> {
  return { count: results.length, next: null, previous: null, results, ...extra };
}

function detail(item: AdminEmployerListItem) {
  return {
    ...item,
    approval_reason: null,
    approved_by_email: null,
    website: null,
    company_summary: null,
    company_size: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("EmployerApprovalQueue", () => {
  it("shows the empty state when no employers match", async () => {
    getAdminEmployers.mockResolvedValue(page([]));
    renderQueue(<EmployerApprovalQueue />);
    expect(await screen.findByText("No employers match")).toBeInTheDocument();
  });

  it("shows a retry-able error state on failure", async () => {
    getAdminEmployers.mockRejectedValue(
      new ApiRequestError({ code: "server_error", message: "boom", status: 500 }),
    );
    renderQueue(<EmployerApprovalQueue />);
    expect(await screen.findByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });

  it("renders pending rows with Approve + Reject actions only", async () => {
    getAdminEmployers.mockResolvedValue(page([employer()]));
    renderQueue(<EmployerApprovalQueue />);
    expect(await screen.findByText("Acme Ltd")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Suspend" }),
    ).not.toBeInTheDocument();
  });

  it("offers Suspend for approved and Restore for suspended", async () => {
    getAdminEmployers.mockResolvedValue(
      page([
        employer({ id: "e1", approval_status: "APPROVED" }),
        employer({ id: "e2", company_name: "Beta Co", approval_status: "SUSPENDED" }),
      ]),
    );
    renderQueue(<EmployerApprovalQueue />);
    expect(
      await screen.findByRole("button", { name: "Suspend" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Restore" })).toBeInTheDocument();
  });

  it("approves a pending employer and shows success feedback", async () => {
    const item = employer();
    getAdminEmployers.mockResolvedValue(page([item]));
    approveEmployer.mockResolvedValue(detail(item));
    renderQueue(<EmployerApprovalQueue />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Approve" }),
    );

    await waitFor(() =>
      expect(approveEmployer).toHaveBeenCalledWith("e1", "en"),
    );
    expect(
      await screen.findByText("Acme Ltd has been approved."),
    ).toBeInTheDocument();
  });

  it("rejects via the dialog, sending the reason, and shows feedback", async () => {
    const item = employer();
    getAdminEmployers.mockResolvedValue(page([item]));
    rejectEmployer.mockResolvedValue(detail(item));
    renderQueue(<EmployerApprovalQueue />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Reject" }),
    );
    // Dialog opens.
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await userEvent.type(
      screen.getByLabelText(/Reason for rejection/),
      "Cannot verify registration",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Reject employer" }),
    );

    await waitFor(() =>
      expect(rejectEmployer).toHaveBeenCalledWith(
        "e1",
        "Cannot verify registration",
        "en",
      ),
    );
    expect(
      await screen.findByText("Acme Ltd has been rejected."),
    ).toBeInTheDocument();
  });

  it("keeps the reject dialog open and surfaces a field error on 400", async () => {
    const item = employer();
    getAdminEmployers.mockResolvedValue(page([item]));
    rejectEmployer.mockRejectedValue(
      new ApiRequestError({
        code: "validation_error",
        message: "Invalid",
        status: 400,
        fields: { reason: ["This employer cannot be rejected."] },
      }),
    );
    renderQueue(<EmployerApprovalQueue />);

    await userEvent.click(
      await screen.findByRole("button", { name: "Reject" }),
    );
    await userEvent.type(
      screen.getByLabelText(/Reason for rejection/),
      "short",
    );
    await userEvent.click(
      screen.getByRole("button", { name: "Reject employer" }),
    );

    expect(
      await screen.findByText("This employer cannot be rejected."),
    ).toBeInTheDocument();
    // Still open for correction.
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
