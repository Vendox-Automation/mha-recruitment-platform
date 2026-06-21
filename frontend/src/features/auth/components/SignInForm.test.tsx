import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError } from "@/lib/api/client";
import { renderWithProviders } from "@/test/renderWithProviders";

import { SignInForm } from "./SignInForm";

const replace = vi.fn();
const ensureCsrf = vi.fn();
const login = vi.fn();
// AuthProvider's me query calls getMe on mount; default to anonymous (401).
const getMe = vi.fn();

vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace, push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => "/sign-in",
  redirect: vi.fn(),
  getPathname: vi.fn(),
}));

vi.mock("@/lib/api/auth", () => ({
  ensureCsrf: (...args: unknown[]) => ensureCsrf(...args),
  login: (...args: unknown[]) => login(...args),
  getMe: (...args: unknown[]) => getMe(...args),
  logout: vi.fn(),
}));

function anonymous() {
  getMe.mockRejectedValue(
    new ApiRequestError({ code: "authentication_required", message: "no", status: 401 }),
  );
}

describe("SignInForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    anonymous();
    ensureCsrf.mockResolvedValue(undefined);
  });

  it("validates required fields before calling the API", async () => {
    const user = userEvent.setup();
    renderWithProviders(<SignInForm />);

    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(await screen.findAllByText("This field is required.")).toHaveLength(2);
    expect(login).not.toHaveBeenCalled();
  });

  it("primes CSRF, logs in, and redirects role-aware on success", async () => {
    const user = userEvent.setup();
    login.mockResolvedValue({
      id: "u1",
      email: "cand@example.com",
      role: "CANDIDATE",
      status: "ACTIVE",
      preferred_locale: "en",
      is_email_verified: true,
      profile: null,
    });

    renderWithProviders(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), "cand@example.com");
    await user.type(screen.getByLabelText(/password/i), "correcthorse10");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() => expect(login).toHaveBeenCalledOnce());
    // CSRF must be primed before the login POST (ADR-0001 §4.1).
    expect(ensureCsrf).toHaveBeenCalled();
    expect(ensureCsrf.mock.invocationCallOrder[0]).toBeLessThan(
      login.mock.invocationCallOrder[0],
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith("/candidate/dashboard"),
    );
  });

  it("shows the localised invalid-credentials message on a 400 (L-B2)", async () => {
    const user = userEvent.setup();
    login.mockRejectedValue(
      new ApiRequestError({
        code: "validation_error",
        // Raw English server message — the UI must NOT surface this verbatim.
        message: "These credentials are invalid.",
        fields: { non_field_errors: ["These credentials are invalid."] },
        status: 400,
      }),
    );

    renderWithProviders(<SignInForm />);

    await user.type(screen.getByLabelText(/email/i), "cand@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrongpassword1");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    // Contextual localised copy is shown instead of the raw English message.
    expect(
      await screen.findByText("The email or password is incorrect."),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("These credentials are invalid."),
    ).not.toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
