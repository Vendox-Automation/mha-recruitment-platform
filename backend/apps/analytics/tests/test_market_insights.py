"""Curated MHA insights on the public endpoint (spec §13.5, §15.8, AGENTS §13).

The Career Intelligence Console shows administrator-curated "MHA insight" cards
ALONGSIDE the computed platform aggregates. These tests pin the integrity
contract: only published rows appear, ordered by ``display_order``; the existing
platform-aggregate fields are untouched; and the honest default is an empty list.
"""

from __future__ import annotations

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.analytics.models import MarketInsight
from apps.jobs.models import Job


def _insight(
    title: str,
    *,
    display_order: int = 0,
    is_published: bool = True,
    category: str = MarketInsight.Category.HIRING_OUTLOOK,
    body: str = "Synthetic insight body.",
) -> MarketInsight:
    return MarketInsight.objects.create(
        title=title,
        body=body,
        category=category,
        display_order=display_order,
        is_published=is_published,
    )


@pytest.mark.django_db
def test_empty_list_when_none_published(api):
    # Honest default: nothing curated yet -> empty list, never fabricated content.
    _insight("Draft only", is_published=False)

    resp = api.get(reverse("analytics-public:public-insights"))
    assert resp.status_code == 200
    assert resp.data["mha_insights"] == []


@pytest.mark.django_db
def test_only_published_insights_returned(api):
    _insight("Published card", is_published=True)
    _insight("Hidden card", is_published=False)

    resp = api.get(reverse("analytics-public:public-insights"))
    titles = [item["title"] for item in resp.data["mha_insights"]]
    assert titles == ["Published card"]
    assert "Hidden card" not in titles


@pytest.mark.django_db
def test_insights_ordered_by_display_order(api):
    _insight("Third", display_order=30)
    _insight("First", display_order=10)
    _insight("Second", display_order=20)

    resp = api.get(reverse("analytics-public:public-insights"))
    titles = [item["title"] for item in resp.data["mha_insights"]]
    assert titles == ["First", "Second", "Third"]


@pytest.mark.django_db
def test_insight_item_shape_and_source_label(api):
    insight = _insight(
        "Roles in focus this quarter",
        category=MarketInsight.Category.ROLES_IN_FOCUS,
        body="Demand is rising for data roles.",
    )

    resp = api.get(reverse("analytics-public:public-insights"))
    item = resp.data["mha_insights"][0]
    assert item == {
        "id": str(insight.id),
        "title": "Roles in focus this quarter",
        "body": "Demand is rising for data roles.",
        "category": MarketInsight.Category.ROLES_IN_FOCUS,
        "source_label": "mha_insight",
    }


@pytest.mark.django_db
def test_platform_aggregate_fields_unchanged(api):
    # A published market insight must NOT alter the real platform aggregates.
    Job.objects.create(
        title="Analyst",
        location="Kuala Lumpur",
        status=Job.Status.PUBLISHED,
        published_at=timezone.now(),
    )
    _insight("Some editorial card")

    resp = api.get(reverse("analytics-public:public-insights"))
    data = resp.data
    # Existing aggregate keys remain present with their original meaning.
    for key in (
        "published_job_count",
        "approved_employer_count",
        "recent_job_count",
        "popular_locations",
        "popular_role_keywords",
        "min_group_size",
    ):
        assert key in data
    assert data["published_job_count"] == 1
    # The curated list is a SEPARATE key, not folded into the aggregates.
    assert "mha_insights" in data
    assert isinstance(data["mha_insights"], list)
