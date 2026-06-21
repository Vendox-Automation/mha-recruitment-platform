"""Employer analytics — strictly own-job aggregates (spec §15.8, AGENTS §13).

Every figure is scoped to ``employer``'s OWN jobs and the applications/views to
them. There is no cross-employer comparison and no individual-candidate data: the
output is counts and averages only, never an applicant identity.

Integrity rules (AGENTS §13):

* Do not mislead with precision the data cannot support. A conversion rate or
  time-to-first-application is returned as ``null`` (not 0 or 100%) when there are
  too few views/applications to be reliable, so the UI can hide it.
* Distinguish the source of each number: views come from ``JobViewEvent``,
  applications from ``Application`` — they are reported separately.

Reliability thresholds:

* ``MIN_RELIABLE_VIEWS`` — the conversion rate is only computed when total views
  reaches this floor; a single view yielding one application is not "100%".
"""

from __future__ import annotations

from typing import Any

from django.db.models import Count, Min
from django.utils import timezone

from apps.analytics.models import JobViewEvent
from apps.applications.models import Application, ApplicationStatus
from apps.jobs.models import Job

# Views below this floor make a conversion rate statistically meaningless, so it
# is reported as null rather than a misleading percentage.
MIN_RELIABLE_VIEWS = 10


def _stage_distribution(applications) -> dict[str, int]:
    """Counts of the employer's applications by status (all stages present)."""
    distribution = {status.value: 0 for status in ApplicationStatus}
    for row in applications.values("status").annotate(n=Count("id")):
        distribution[row["status"]] = row["n"]
    return distribution


def _time_to_first_application_seconds(jobs) -> float | None:
    """Average seconds from a job's publish to its FIRST application.

    Averaged only over the employer's jobs that are published AND have at least
    one application; jobs without either are excluded (they would distort the
    mean). Returns ``None`` when no qualifying job exists, so the metric is hidden
    rather than shown as zero.
    """
    rows = (
        jobs.filter(published_at__isnull=False)
        .annotate(first_app=Min("applications__submitted_at"))
        .filter(first_app__isnull=False)
        .values("published_at", "first_app")
    )
    deltas = [
        (row["first_app"] - row["published_at"]).total_seconds()
        for row in rows
        if row["first_app"] >= row["published_at"]
    ]
    if not deltas:
        return None
    return sum(deltas) / len(deltas)


def employer_analytics(employer) -> dict[str, Any]:
    """Own-job analytics for ``employer`` (spec §15.8).

    All querysets are scoped to ``employer`` so another employer's views,
    applications, or jobs can never be counted.
    """
    jobs = Job.objects.for_employer(employer)
    applications = Application.objects.filter(job__employer=employer)
    views_qs = JobViewEvent.objects.filter(job__employer=employer)

    total_views = views_qs.count()
    total_applications = applications.count()

    # Conversion is only meaningful with a reliable number of views; otherwise
    # null so the UI hides it rather than showing a misleading 0% / 100%.
    if total_views >= MIN_RELIABLE_VIEWS:
        conversion_rate = round(total_applications / total_views, 4)
    else:
        conversion_rate = None

    ttfa = _time_to_first_application_seconds(jobs)

    return {
        "jobs": {
            "total": jobs.count(),
            "published": jobs.filter(status=Job.Status.PUBLISHED).count(),
        },
        "views": {
            "total": total_views,
            "reliable": total_views >= MIN_RELIABLE_VIEWS,
        },
        "applications": {
            "total": total_applications,
        },
        # null when views are not reliable (never a misleading number).
        "application_conversion_rate": conversion_rate,
        # Average seconds to first application; null when not derivable.
        "time_to_first_application_seconds": ttfa,
        "stage_distribution": _stage_distribution(applications),
        "generated_at": timezone.now(),
    }
