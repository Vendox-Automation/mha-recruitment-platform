"""Public career-intelligence insights (spec §15.8, AGENTS §13).

Only RELIABLE, non-identifying aggregates are returned. The governing rules:

* Never fabricate — every number is computed from real rows.
* Distinguish nothing the platform cannot back with data: a metric with too few
  underlying rows is OMITTED rather than shown as a misleading near-zero.
* Protect small groups — a location or role keyword is only surfaced once it
  reaches ``MIN_GROUP_SIZE`` listings, so a single employer/job cannot be singled
  out from "popular" lists (k-anonymity-style threshold).

All counts come from ``Job.objects.public()`` so suspended/draft/expired jobs and
unapproved employers never contribute.
"""

from __future__ import annotations

import re
from collections import Counter
from datetime import timedelta
from typing import Any

from django.db.models import Count
from django.utils import timezone

from apps.analytics.models import MarketInsight
from apps.employers.models import EmployerProfile
from apps.jobs.models import Job

# A location / keyword must appear in at least this many public jobs before it is
# shown, so a "popular" entry never reveals a single small employer's activity.
MIN_GROUP_SIZE = 3

# How many top entries to surface for each popularity list.
TOP_N = 8

# Window for the "recent activity" count.
RECENT_DAYS = 30

# Tokens too generic to be a useful "popular role keyword".
_STOPWORDS = frozenset(
    {
        "and",
        "or",
        "the",
        "a",
        "an",
        "of",
        "for",
        "to",
        "in",
        "with",
        "senior",
        "junior",
        "lead",
        "staff",
        "experienced",
    }
)
_WORD_RE = re.compile(r"[A-Za-z][A-Za-z+#.]{2,}")


def _popular_locations(public_jobs) -> list[dict[str, Any]]:
    """Locations with at least ``MIN_GROUP_SIZE`` public jobs, top ``TOP_N``.

    A location whose count is below the threshold is dropped entirely (small-group
    protection), so the list never exposes a near-unique listing's town.
    """
    rows = (
        public_jobs.exclude(location="")
        .values("location")
        .annotate(count=Count("id"))
        .filter(count__gte=MIN_GROUP_SIZE)
        .order_by("-count", "location")[:TOP_N]
    )
    return [{"location": r["location"], "count": r["count"]} for r in rows]


def _popular_role_keywords(public_jobs) -> list[dict[str, Any]]:
    """Frequent title keywords appearing in at least ``MIN_GROUP_SIZE`` jobs.

    Titles are tokenised in Python (portable, no full-text dependency). A keyword
    is only surfaced once it reaches the group-size threshold, so a one-off niche
    title cannot identify a single job.
    """
    counter: Counter[str] = Counter()
    for title in public_jobs.values_list("title", flat=True):
        seen: set[str] = set()
        for match in _WORD_RE.findall(title or ""):
            word = match.lower()
            if word in _STOPWORDS or word in seen:
                continue
            seen.add(word)
            counter[word] += 1
    return [
        {"keyword": word, "count": count}
        for word, count in counter.most_common()
        if count >= MIN_GROUP_SIZE
    ][:TOP_N]


def _mha_insights() -> list[dict[str, Any]]:
    """Administrator-curated "MHA insight" cards, PUBLISHED only.

    These are editorial rows written by an MHA administrator (spec §13.5) — a
    source distinct from the computed platform aggregates above. Only published
    rows are surfaced and the honest default is an empty list until an admin adds
    content; nothing here is fabricated by the system. Each item carries
    ``source_label="mha_insight"`` so the client can label it correctly and never
    present it as platform analytics (AGENTS §13).
    """
    rows = MarketInsight.objects.filter(is_published=True).order_by("display_order", "-created_at")
    return [
        {
            "id": str(row.id),
            "title": row.title,
            "body": row.body,
            "category": row.category,
            "source_label": "mha_insight",
        }
        for row in rows
    ]


def public_insights() -> dict[str, Any]:
    """Assemble the public insights payload.

    The response holds two clearly separated sources:

    * Computed *platform analytics* — the real, reliable aggregates below
      (job/employer/recent counts and small-group-protected popularity lists).
    * Curated *MHA insights* — the ``mha_insights`` list of administrator-written
      editorial cards, each tagged ``source_label="mha_insight"``.

    The client labels the aggregates "platform analytics" and the list
    "MHA insight"; the two are never conflated (AGENTS §13).
    """
    public_jobs = Job.objects.public()
    published_job_count = public_jobs.count()

    approved_employer_count = EmployerProfile.objects.filter(
        approval_status=EmployerProfile.ApprovalStatus.APPROVED
    ).count()

    cutoff = timezone.now() - timedelta(days=RECENT_DAYS)
    recent_job_count = public_jobs.filter(published_at__gte=cutoff).count()

    return {
        "published_job_count": published_job_count,
        "approved_employer_count": approved_employer_count,
        "recent_job_count": recent_job_count,
        "popular_locations": _popular_locations(public_jobs),
        "popular_role_keywords": _popular_role_keywords(public_jobs),
        # Surfaced so the client knows entries below this size were withheld
        # (transparency, not fabrication).
        "min_group_size": MIN_GROUP_SIZE,
        # Curated editorial cards — a SEPARATE source from the aggregates above
        # (administrator-managed; published-only; empty until an admin curates).
        "mha_insights": _mha_insights(),
    }
