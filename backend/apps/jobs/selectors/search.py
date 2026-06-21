"""Portable job search / filtering (ADR-0001 §6.1.3, spec §15.3, §21.4).

Search is implemented with portable ``icontains`` / ``Q`` filtering only — no
``django.contrib.postgres`` full-text/trigram features — so it behaves
identically on PostgreSQL and the local SQLite fallback. A Postgres FTS upgrade
is a documented later enhancement, not part of the MVP.

Case-insensitivity is explicit (``__icontains``) because SQLite ``LIKE`` is
case-insensitive by default while PostgreSQL is not (ADR-0001 §6.1.7).
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation

from django.db.models import Case, IntegerField, Q, QuerySet, Value, When

from apps.jobs.models import Job

# Accepted sort keys (query param ``sort``).
SORT_NEWEST = "newest"
SORT_RELEVANT = "relevant"
VALID_SORTS = {SORT_NEWEST, SORT_RELEVANT}


def _parse_decimal(raw: str | None) -> Decimal | None:
    if raw in (None, ""):
        return None
    try:
        value = Decimal(str(raw))
    except (InvalidOperation, ValueError, TypeError):
        return None
    if value < 0:
        return None
    return value


def apply_filters(queryset: QuerySet[Job], params) -> QuerySet[Job]:
    """Apply public job-search filters from query params.

    Filters (all optional): ``keyword`` (case-insensitive over title,
    description, requirements, location), ``location`` (icontains),
    ``employment_type`` (exact choice), ``salary_min`` / ``salary_max``
    (range overlap).
    """
    keyword = (params.get("keyword") or "").strip()
    if keyword:
        queryset = queryset.filter(
            Q(title__icontains=keyword)
            | Q(description__icontains=keyword)
            | Q(requirements__icontains=keyword)
            | Q(location__icontains=keyword)
        )

    location = (params.get("location") or "").strip()
    if location:
        queryset = queryset.filter(location__icontains=location)

    employment_type = (params.get("employment_type") or "").strip()
    if employment_type in Job.EmploymentType.values:
        queryset = queryset.filter(employment_type=employment_type)

    queryset = _apply_salary_filter(queryset, params)
    return queryset


def _apply_salary_filter(queryset: QuerySet[Job], params) -> QuerySet[Job]:
    """Filter by a requested salary band using range *overlap*.

    A job matches when its disclosed band overlaps the requested band. Jobs
    without a disclosed salary (``salary_disclosed=False`` or both bounds null)
    are NOT excluded by a salary filter — withholding pay must not hide a job —
    so the salary predicate is OR'd with "no disclosed figure".
    """
    want_min = _parse_decimal(params.get("salary_min"))
    want_max = _parse_decimal(params.get("salary_max"))
    if want_min is None and want_max is None:
        return queryset

    # A job's effective band: lower bound = salary_min (or salary_max if only
    # max is set), upper bound = salary_max (or salary_min). Overlap test:
    #   job_upper >= want_min AND job_lower <= want_max.
    # The band predicate only ever considers DISCLOSED jobs so that an
    # undisclosed job's stored figures can never become an inference oracle
    # through binary-searched salary params (security review rec 3). Undisclosed
    # jobs are added back unconditionally via the `undisclosed` clause below.
    overlap = Q(salary_disclosed=True)
    if want_min is not None:
        overlap &= Q(salary_max__gte=want_min) | (
            Q(salary_max__isnull=True) & Q(salary_min__gte=want_min)
        )
    if want_max is not None:
        overlap &= Q(salary_min__lte=want_max) | (
            Q(salary_min__isnull=True) & Q(salary_max__lte=want_max)
        )

    undisclosed = Q(salary_disclosed=False) | (
        Q(salary_min__isnull=True) & Q(salary_max__isnull=True)
    )
    return queryset.filter(overlap | undisclosed)


def apply_sort(queryset: QuerySet[Job], params) -> QuerySet[Job]:
    """Order results by ``sort`` (``newest`` default, or ``relevant``).

    ``relevant`` is deterministic and portable: a title keyword match ranks
    above a body-only match, ties broken by recency. With no keyword it falls
    back to recency so the ordering is always well-defined.
    """
    sort = (params.get("sort") or SORT_NEWEST).strip()
    if sort not in VALID_SORTS:
        sort = SORT_NEWEST

    keyword = (params.get("keyword") or "").strip()
    if sort == SORT_RELEVANT and keyword:
        queryset = queryset.annotate(
            relevance=Case(
                When(title__icontains=keyword, then=Value(2)),
                When(
                    Q(description__icontains=keyword) | Q(requirements__icontains=keyword),
                    then=Value(1),
                ),
                default=Value(0),
                output_field=IntegerField(),
            )
        )
        return queryset.order_by("-relevance", "-published_at", "-created_at")

    # newest (and relevant-without-keyword) -> recency.
    return queryset.order_by("-published_at", "-created_at")


def search_public_jobs(params) -> QuerySet[Job]:
    """Public job search: scope to ``.public()`` then filter + sort."""
    queryset = Job.objects.public().select_related("employer")
    queryset = apply_filters(queryset, params)
    return apply_sort(queryset, params)
