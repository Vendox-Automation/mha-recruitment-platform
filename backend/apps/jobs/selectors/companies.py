"""Public company directory selectors (spec §14.4, §21.7).

A "company" is an APPROVED ``EmployerProfile``. Only approved employers appear
publicly; pending / rejected / suspended employers are never listed. The active
job count counts only ``Job.objects.public()`` jobs for that employer, computed
with a portable annotated subquery (no Postgres-specific aggregation).
"""

from __future__ import annotations

from django.db.models import Avg, Count, OuterRef, Q, QuerySet, Subquery
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.employers.models import EmployerProfile
from apps.jobs.models import Job
from apps.reviews.models import CompanyReview

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

    # Review aggregates come from correlated subqueries, NOT a second relation
    # join: joining ``reviews`` alongside the ``jobs`` count would fan the rows
    # out and corrupt both aggregates. ``review_avg`` is NULL for a company with
    # no reviews (the serializer maps that to ``None``); the count Coalesces to 0.
    review_base = CompanyReview.objects.filter(employer=OuterRef("pk"))
    review_avg = Subquery(review_base.values("employer").annotate(a=Avg("rating")).values("a")[:1])
    review_count = Subquery(review_base.values("employer").annotate(c=Count("id")).values("c")[:1])
    return queryset.annotate(
        active_job_count=Count("jobs", filter=_public_job_count_filter(), distinct=True),
        review_avg=review_avg,
        review_count_anno=Coalesce(review_count, 0),
    ).order_by("company_name")


def get_public_company_or_none(slug: str) -> EmployerProfile | None:
    """Return an APPROVED company by slug, or None (never an unapproved one)."""
    return EmployerProfile.objects.filter(approval_status=AS.APPROVED, slug=slug).first()
