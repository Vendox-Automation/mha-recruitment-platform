"""Public company directory selectors (spec §14.4, §21.7).

A "company" is an APPROVED ``EmployerProfile``. Only approved employers appear
publicly; pending / rejected / suspended employers are never listed. The active
job count counts only ``Job.objects.public()`` jobs for that employer, computed
with a portable annotated subquery (no Postgres-specific aggregation).
"""

from __future__ import annotations

from django.db.models import Count, Q, QuerySet
from django.utils import timezone

from apps.employers.models import EmployerProfile
from apps.jobs.models import Job

AS = EmployerProfile.ApprovalStatus


def _public_job_count_filter() -> Q:
    """Q matching only the approved employer's public jobs for annotation."""
    today = timezone.localdate()
    return Q(jobs__status=Job.Status.PUBLISHED) & (
        Q(jobs__application_deadline__isnull=True) | Q(jobs__application_deadline__gte=today)
    )


def approved_companies_with_job_counts(*, name: str = "") -> QuerySet[EmployerProfile]:
    """Approved companies, annotated with their active (public) job count.

    Optional ``name`` filters by company name, case-insensitively (portable
    ``icontains`` — ADR-0001 §6.1.7).
    """
    queryset = EmployerProfile.objects.filter(approval_status=AS.APPROVED)
    if name:
        queryset = queryset.filter(company_name__icontains=name)
    return queryset.annotate(
        active_job_count=Count("jobs", filter=_public_job_count_filter(), distinct=True)
    ).order_by("company_name")


def get_public_company_or_none(slug: str) -> EmployerProfile | None:
    """Return an APPROVED company by slug, or None (never an unapproved one)."""
    return EmployerProfile.objects.filter(approval_status=AS.APPROVED, slug=slug).first()
