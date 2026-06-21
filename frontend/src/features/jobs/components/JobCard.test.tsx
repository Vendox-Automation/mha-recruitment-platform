import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import enCommon from "@/messages/en/common.json";
import enJobs from "@/messages/en/jobs.json";

import { JobCard } from "./JobCard";
import type { PublicJobListItem } from "../types";

// The ui barrel re-exports LinkButton -> @/i18n/navigation; mock it under jsdom.
vi.mock("@/i18n/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn(), prefetch: vi.fn() }),
  Link: ({ children, ...props }: { children: ReactNode }) => (
    <a {...props}>{children}</a>
  ),
  usePathname: () => "/jobs",
}));

const messages = { jobs: enJobs, common: enCommon };

function renderCard(job: PublicJobListItem) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <JobCard job={job} as="link" />
    </NextIntlClientProvider>,
  );
}

const baseJob: PublicJobListItem = {
  slug: "senior-nurse",
  title: "Senior Nurse",
  location: "London",
  employment_type: "FULL_TIME",
  salary_min: 30000,
  salary_max: 45000,
  salary_currency: "GBP",
  salary_period: "year",
  salary_disclosed: true,
  listing_language: "en",
  is_mha_supported: true,
  published_at: "2026-06-01T00:00:00Z",
  company: {
    slug: "mha-health",
    company_name: "MHA Health",
    logo: null,
    industry: "Healthcare",
    company_location: "London",
  },
};

describe("JobCard", () => {
  it("renders the disclosed salary range, not the 'not disclosed' label", () => {
    renderCard(baseJob);
    expect(screen.getByText(/30,000/)).toBeInTheDocument();
    expect(
      screen.queryByText(enJobs.card.salaryNotDisclosed),
    ).not.toBeInTheDocument();
  });

  it("shows 'Salary not disclosed' when the employer hid figures", () => {
    renderCard({
      ...baseJob,
      salary_disclosed: false,
      salary_min: null,
      salary_max: null,
    });
    expect(
      screen.getByText(enJobs.card.salaryNotDisclosed),
    ).toBeInTheDocument();
  });

  it("falls back to a flexible-location label when location is null", () => {
    renderCard({ ...baseJob, location: null });
    expect(
      screen.getByText(enJobs.card.locationUnspecified),
    ).toBeInTheDocument();
  });

  it("renders the approved + MHA-supported markers", () => {
    renderCard(baseJob);
    expect(
      screen.getByText(enCommon.badge.approvedEmployer),
    ).toBeInTheDocument();
    expect(screen.getByText(enCommon.badge.mhaSupported)).toBeInTheDocument();
  });

  it("omits the MHA-supported marker when not supported", () => {
    renderCard({ ...baseJob, is_mha_supported: false });
    expect(
      screen.queryByText(enCommon.badge.mhaSupported),
    ).not.toBeInTheDocument();
  });
});
