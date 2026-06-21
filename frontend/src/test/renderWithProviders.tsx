import { QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactElement, ReactNode } from "react";

import { AuthProvider } from "@/lib/auth";
import { createQueryClient } from "@/lib/queryClient";

import enAuth from "@/messages/en/auth.json";
import enCommon from "@/messages/en/common.json";
import enJobs from "@/messages/en/jobs.json";
import enValidation from "@/messages/en/validation.json";

/** Minimal message set the auth components reach for. */
const messages = {
  auth: enAuth,
  common: enCommon,
  jobs: enJobs,
  validation: enValidation,
};

/**
 * Render a component inside the same provider stack the app uses: i18n (en),
 * a fresh TanStack Query client, and the session-backed AuthProvider. Each call
 * gets an isolated query client so tests never share cached `me` state.
 */
export function renderWithProviders(ui: ReactElement) {
  function Wrapper({ children }: { children: ReactNode }) {
    const queryClient = createQueryClient();
    return (
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper });
}
