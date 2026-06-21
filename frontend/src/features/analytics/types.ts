/**
 * Employer analytics domain types (spec §15.8, §21.8).
 *
 * Mirrors `apps/analytics/selectors/employer_analytics.py::employer_analytics`.
 *
 * INTEGRITY (spec §13, AGENTS §13): some metrics are `null` when the data is too
 * sparse to be reliable — `application_conversion_rate` is null until views reach
 * the backend floor (`MIN_RELIABLE_VIEWS`), and `time_to_first_application_seconds`
 * is null when no qualifying job exists. The UI MUST render an honest "not enough
 * data yet" for these — never a fabricated 0% / 100%.
 */

import type { ApplicationStatus } from "@/features/applications/types";

/** Distribution of the employer's applications across the seven stages. */
export type StageDistribution = Record<ApplicationStatus, number>;

export interface EmployerAnalytics {
  jobs: {
    total: number;
    published: number;
  };
  views: {
    total: number;
    /** Whether the view count meets the reliability floor for a conversion rate. */
    reliable: boolean;
  };
  applications: {
    total: number;
  };
  /** Applications ÷ views — `null` when views are not yet reliable. */
  application_conversion_rate: number | null;
  /** Average seconds from publish to first application — `null` when not derivable. */
  time_to_first_application_seconds: number | null;
  stage_distribution: StageDistribution;
  generated_at: string;
}
