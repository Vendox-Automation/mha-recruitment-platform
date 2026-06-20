/** TanStack Query keys for the employer applicant workspace (single source). */

import type { ApplicantListParams } from "./types";

/** The employer dashboard snapshot. */
export const EMPLOYER_DASHBOARD_KEY = ["employer", "dashboard"] as const;

/** Applicants to ONE owned job (the per-job workspace). Params keep it scoped. */
export function jobApplicantsKey(jobId: string, params?: ApplicantListParams) {
  return [
    "employer",
    "applicants",
    "job",
    jobId,
    {
      status: params?.status ?? "",
      search: params?.search ?? "",
      ordering: params?.ordering ?? "",
    },
  ] as const;
}

/** A single applicant's full detail by id. */
export function applicantDetailKey(id: string) {
  return ["employer", "applicants", "detail", id] as const;
}
