"""Read-side aggregations for the candidate (profile completion, dashboard).

These are pure, deterministic computations over a ``CandidateProfile`` so the
same numbers appear in the profile payload, the dashboard, and the ``auth/me``
profile summary. Application statistics are Phase 6 — until then the dashboard
reports honest zeros (no fabricated activity, spec §22.3).
"""

from __future__ import annotations

from typing import Any

from apps.candidates.models import CandidateProfile

# Deterministic completion checklist. Order is stable so the breakdown is
# reproducible for the UI's "what's missing" nudges.
_COMPLETION_CHECKS: tuple[tuple[str, str], ...] = (
    ("full_name", "Full name"),
    ("phone", "Phone number"),
    ("preferred_job_title", "Preferred job title"),
    ("preferred_location", "Preferred location"),
    ("preferred_employment_type", "Preferred employment type"),
    ("resume", "Resume uploaded"),
)


def _check_value(profile: CandidateProfile, key: str) -> bool:
    if key == "resume":
        return profile.has_resume
    return bool(getattr(profile, key))


def profile_completion(profile: CandidateProfile) -> dict[str, Any]:
    """Return percentage complete plus the per-field breakdown.

    Deterministic: ``percent`` is ``round(100 * satisfied / total)``.
    """
    items = [
        {"field": key, "label": label, "complete": _check_value(profile, key)}
        for key, label in _COMPLETION_CHECKS
    ]
    satisfied = sum(1 for item in items if item["complete"])
    total = len(items)
    percent = round(100 * satisfied / total) if total else 0
    missing = [item["field"] for item in items if not item["complete"]]
    return {
        "percent": percent,
        "complete": percent == 100,
        "items": items,
        "missing": missing,
    }


def dashboard_snapshot(profile: CandidateProfile) -> dict[str, Any]:
    """Aggregate the candidate's dashboard snapshot (spec §14.9, §21.2).

    Application stats are Phase 6; we return honest zeros/empties here rather
    than placeholder fabricated activity.
    """
    return {
        "profile_completion": profile_completion(profile),
        "resume": {
            "has_resume": profile.has_resume,
            "original_name": profile.resume_original_name or None,
            "uploaded_at": profile.resume_uploaded_at,
            "parsing_status": profile.resume_parsing_status,
        },
        "preferences": {
            "preferred_job_title": profile.preferred_job_title,
            "preferred_location": profile.preferred_location,
            "preferred_employment_type": profile.preferred_employment_type,
        },
        "applications": _application_stats(profile),
        # Saved jobs land in Phase 9 — honest empty until then.
        "saved_jobs": {"total": 0},
    }


def _application_stats(profile: CandidateProfile) -> dict[str, Any]:
    """Real application counts (Phase 6).

    Imported locally to avoid a module-load dependency from ``candidates`` onto
    ``applications`` (the FK direction is applications -> candidates). This is a
    narrow read-only aggregation reference at call time only.
    """
    from apps.applications.selectors import candidate_application_stats

    return candidate_application_stats(profile)
