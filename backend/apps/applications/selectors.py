"""Read-side aggregations for applications (candidate dashboard snapshot)."""

from __future__ import annotations

from typing import Any

from django.db.models import Count

from .models import POSITIVE_SNAPSHOT_STATUSES, Application, ApplicationStatus


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
