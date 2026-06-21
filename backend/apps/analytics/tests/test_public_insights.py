"""Public insights: reliable aggregates only + small-group omission (spec §15.8)."""

from __future__ import annotations

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.analytics.selectors.public_insights import MIN_GROUP_SIZE
from apps.employers.models import EmployerProfile
from apps.jobs.models import Job


def _publish(title: str, location: str, employer: EmployerProfile | None = None) -> Job:
    return Job.objects.create(
        title=title,
        location=location,
        status=Job.Status.PUBLISHED,
        employer=employer,
        published_at=timezone.now(),
    )


@pytest.mark.django_db
def test_counts_only_public_jobs(api):
    _publish("Analyst", "Kuala Lumpur")
    Job.objects.create(title="Hidden", status=Job.Status.DRAFT, location="Penang")

    resp = api.get(reverse("analytics-public:public-insights"))
    assert resp.status_code == 200
    assert resp.data["published_job_count"] == 1


@pytest.mark.django_db
def test_small_group_location_is_omitted(api):
    # A location reaching the threshold IS shown.
    for i in range(MIN_GROUP_SIZE):
        _publish(f"Analyst {i}", "Kuala Lumpur")
    # A location below the threshold (here a single job) must be WITHHELD.
    _publish("Rare Role", "Tiny Town")

    resp = api.get(reverse("analytics-public:public-insights"))
    assert resp.status_code == 200
    locations = {row["location"] for row in resp.data["popular_locations"]}
    assert "Kuala Lumpur" in locations
    assert "Tiny Town" not in locations  # small-group protection (k-anonymity)


@pytest.mark.django_db
def test_popular_keywords_respect_threshold(api):
    for i in range(MIN_GROUP_SIZE):
        _publish(f"Data Engineer {i}", "Kuala Lumpur")
    _publish("Unicorn Wrangler", "Kuala Lumpur")

    resp = api.get(reverse("analytics-public:public-insights"))
    keywords = {row["keyword"] for row in resp.data["popular_role_keywords"]}
    assert "data" in keywords or "engineer" in keywords
    assert "unicorn" not in keywords  # appears only once -> withheld


@pytest.mark.django_db
def test_recent_job_count_window(api, make_employer):
    recent = _publish("New Role", "Kuala Lumpur")
    old = _publish("Old Role", "Kuala Lumpur")
    old.published_at = timezone.now() - timezone.timedelta(days=45)
    old.save(update_fields=["published_at"])

    resp = api.get(reverse("analytics-public:public-insights"))
    assert resp.data["published_job_count"] == 2
    assert resp.data["recent_job_count"] == 1
    assert recent.published_at is not None


@pytest.mark.django_db
def test_insights_is_public(api):
    resp = api.get(reverse("analytics-public:public-insights"))
    assert resp.status_code == 200  # no auth required
