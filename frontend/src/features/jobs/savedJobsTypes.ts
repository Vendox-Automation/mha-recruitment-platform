/**
 * Saved-jobs domain types (spec §15.5, §21.2).
 *
 * Mirrors `apps/candidates/serializers.py::SavedJobSerializer`. A saved row pairs
 * the bookmark metadata (`id`, `created_at`) with a compact, presentation-safe job
 * summary and an `is_available` flag. An unavailable job is LABELLED, not hidden
 * (spec §15.5).
 *
 * BACKEND NOTE: the DELETE endpoint (`/candidate/saved-jobs/{job_id}/`) keys off
 * the JOB's UUID. `SavedJobSerializer.get_job` exposes `id` here so the un-save
 * action can address the job directly; see {@link SavedJobSummary.id}.
 */

/** Compact company block embedded in a saved job (matches the serializer). */
export interface SavedJobCompany {
  slug: string;
  company_name: string;
}

/**
 * The presentation-safe job summary inside a saved row. `salary_min`/`salary_max`
 * are blanked (null) when the employer chose not to disclose figures — the same
 * rule the public listing surface uses.
 */
export interface SavedJobSummary {
  /**
   * The job's UUID — required to un-save (the DELETE path is keyed by JOB id).
   * Optional in the type so the UI degrades honestly (disables un-save) if a
   * backend build has not yet exposed it, rather than sending a broken request.
   */
  id?: string;
  slug: string;
  title: string;
  location: string | null;
  employment_type: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_period: string | null;
  salary_disclosed: boolean;
  status: string;
  is_mha_supported: boolean;
  company: SavedJobCompany | null;
}

/** A single saved-job row (SavedJobSerializer). */
export interface SavedJob {
  /** The SavedJob row id (NOT the job id — see {@link SavedJobSummary.id}). */
  id: string;
  created_at: string;
  /** Whether the underlying job is still publicly visible (spec §15.5). */
  is_available: boolean;
  job: SavedJobSummary;
}
