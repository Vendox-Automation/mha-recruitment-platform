"""Read-side aggregations for the candidate (profile completion, dashboard).

These are pure, deterministic computations over a ``CandidateProfile`` so the
same numbers appear in the profile payload, the dashboard, and the ``auth/me``
profile summary. Application statistics are Phase 6 — until then the dashboard
reports honest zeros (no fabricated activity, spec §22.3).
"""

from __future__ import annotations

from typing import Any

from apps.candidates.models import CandidateProfile, SavedJob

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
        "saved_jobs": saved_jobs_stats(profile),
    }


def saved_jobs_list(profile: CandidateProfile) -> list[SavedJob]:
    """The candidate's saved jobs, newest first, with related job/employer.

    ``select_related`` keeps the availability check (which reads the job's status
    and employer approval via ``Job.objects.public``) from issuing per-row
    queries when serialised.
    """
    return list(
        SavedJob.objects.filter(candidate=profile)
        .select_related("job", "job__employer")
        .order_by("-created_at")
    )


def saved_jobs_stats(profile: CandidateProfile) -> dict[str, Any]:
    """Real saved-job counts for the dashboard (spec §14.9, §15.5).

    ``total`` is every bookmark; ``available`` counts only those still public so
    the UI can nudge "N of your saved jobs are no longer open" without hiding the
    rest (spec §15.5: label, do not hide).
    """
    from apps.jobs.models import Job

    saved_job_ids = list(
        SavedJob.objects.filter(candidate=profile).values_list("job_id", flat=True)
    )
    total = len(saved_job_ids)
    if total == 0:
        return {"total": 0, "available": 0}
    available = (
        Job.objects.public().filter(pk__in=saved_job_ids).values_list("pk", flat=True).count()
    )
    return {"total": total, "available": available}


def _application_stats(profile: CandidateProfile) -> dict[str, Any]:
    """Real application counts (Phase 6).

    Imported locally to avoid a module-load dependency from ``candidates`` onto
    ``applications`` (the FK direction is applications -> candidates). This is a
    narrow read-only aggregation reference at call time only.
    """
    from apps.applications.selectors import candidate_application_stats

    return candidate_application_stats(profile)
