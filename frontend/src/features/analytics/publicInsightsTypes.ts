/**
 * Public career-intelligence insight types (spec §5.3, §13.5, §15.8, §21.9).
 *
 * Mirrors `apps/analytics/selectors/public_insights.py::public_insights`. The
 * payload holds TWO clearly separated sources (AGENTS §13):
 *
 *  - Computed *platform analytics* — real, reliable aggregates (job/employer/
 *    recent counts and small-group-protected popularity lists). A location or
 *    keyword is only present once it reaches `min_group_size` listings, so a
 *    single small employer is never identifiable.
 *  - Curated *MHA insights* — `mha_insights`, administrator-written editorial
 *    cards, each carrying `source_label: "mha_insight"`. Empty until an admin
 *    curates content; nothing here is fabricated by the system.
 *
 * The client labels the aggregates "Platform analytics" and the list
 * "MHA insight"; the two are never conflated. When a real value is absent or a
 * list is empty, the UI shows a clearly-labelled "Illustrative preview" module
 * — NEVER a fabricated number.
 */

/** A location surfaced in the popular-locations list (already k-anonymised). */
export interface PopularLocation {
  location: string;
  count: number;
}

/** A role-title keyword surfaced in the popular-keywords list. */
export interface PopularRoleKeyword {
  keyword: string;
  count: number;
}

/** An administrator-curated editorial insight card (published only). */
export interface MhaInsightItem {
  id: string;
  title: string;
  body: string;
  category: string;
  /** Always `"mha_insight"` from the backend — the source tag for this row. */
  source_label: string;
}

/** Full public insights payload (GET /api/v1/insights/public/). */
export interface PublicInsights {
  published_job_count: number;
  approved_employer_count: number;
  recent_job_count: number;
  popular_locations: PopularLocation[];
  popular_role_keywords: PopularRoleKeyword[];
  /** Listings below this size were withheld (transparency, not fabrication). */
  min_group_size: number;
  mha_insights: MhaInsightItem[];
}
