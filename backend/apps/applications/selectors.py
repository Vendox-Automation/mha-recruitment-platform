"""Read-side aggregations for applications.

Candidate dashboard snapshot plus the employer applicant-workspace dashboard.
Every employer aggregation is scoped to the employer's OWN jobs/applications; no
fabricated metrics are produced — view/time-series analytics is Phase 9, and any
field that would require it is omitted here rather than invented.
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from django.db.models import Count, Q
from django.utils import timezone

from apps.jobs.models import Job

from .models import (
    POSITIVE_SNAPSHOT_STATUSES,
    Application,
    ApplicationStatus,
)

# An application is "new / unreviewed" while it is still at the initial APPLIED
# stage — the employer has not yet moved it into their pipeline (spec §14.10).
NEW_APPLICANT_STATUS = ApplicationStatus.APPLIED

# Window for the "jobs near deadline" attention bucket (spec §14.10).
DEADLINE_SOON_DAYS = 7


def candidate_application_stats(candidate) -> dict[str, Any]:
    """Real application counts-by-stage for a candidate (spec §14.9).

    REJECTED is tracked but is not part of the positive ``active`` pipeline
    count — it is never presented as an achievement metric.
    """
    qs = Application.objects.filter(candidate=candidate)
    by_stage = {status.value: 0 for status in ApplicationStatus}
    for row in qs.values("status").annotate(n=Count("id")):
        by_stage[row["status"]] = row["n"]

    recent = [
        {
            "id": str(app.id),
            "job_title": app.job.title,
            "status": app.status,
            "submitted_at": app.submitted_at,
        }
        for app in qs.select_related("job").order_by("-submitted_at")[:5]
    ]
    active = sum(by_stage[s.value] for s in POSITIVE_SNAPSHOT_STATUSES)
    return {
        "total": sum(by_stage.values()),
        "active": active,
        "by_stage": by_stage,
        "recent": recent,
    }


def employer_dashboard_snapshot(employer) -> dict[str, Any]:
    """Real, employer-scoped applicant-workspace dashboard (spec §14.10).

    Everything below is computed from the database and scoped to the employer's
    OWN jobs and the applications to them. There is intentionally NO "views" or
    time-series metric: ``JobViewEvent`` analytics is Phase 9, and fabricating a
    number here would violate the no-fake-data rule (CLAUDE.md). The frontend can
    treat the absence of a views field as "not available yet".
    """
    today = timezone.localdate()
    deadline_cutoff = today + timedelta(days=DEADLINE_SOON_DAYS)

    jobs = Job.objects.for_employer(employer)

    # Per-job application counts (one query), scoped to this employer's jobs.
    job_rows = list(
        jobs.annotate(
            application_count=Count("applications", distinct=True),
            new_applicant_count=Count(
                "applications",
                filter=Q(applications__status=NEW_APPLICANT_STATUS),
                distinct=True,
            ),
        ).order_by("-created_at")
    )

    active_jobs = [
        {
            "id": str(job.id),
            "title": job.title,
            "slug": job.slug,
            "status": job.status,
            "application_deadline": job.application_deadline,
            "application_count": job.application_count,
            "new_applicant_count": job.new_applicant_count,
        }
        for job in job_rows
    ]

    # Attention queue (spec §14.10) — all real counts.
    new_applicants = sum(j["new_applicant_count"] for j in active_jobs)
    draft_jobs = sum(1 for job in job_rows if job.status == Job.Status.DRAFT)
    jobs_near_deadline = sum(
        1
        for job in job_rows
        if job.status == Job.Status.PUBLISHED
        and job.application_deadline is not None
        and today <= job.application_deadline <= deadline_cutoff
    )

    # Candidate pipeline counts by stage across all owned jobs.
    pipeline = {status.value: 0 for status in ApplicationStatus}
    rows = (
        Application.objects.filter(job__employer=employer).values("status").annotate(n=Count("id"))
    )
    for row in rows:
        pipeline[row["status"]] = row["n"]

    return {
        "attention": {
            "new_applicants": new_applicants,
            "jobs_near_deadline": jobs_near_deadline,
            "draft_jobs": draft_jobs,
        },
        "active_jobs": active_jobs,
        "pipeline": pipeline,
        "totals": {
            "jobs": len(active_jobs),
            "applications": sum(pipeline.values()),
        },
    }
