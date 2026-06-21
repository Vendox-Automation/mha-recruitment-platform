"""Employer analytics: own-job scoping, reliability nulls, no candidate leakage."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.core.files.base import ContentFile
from django.urls import reverse
from django.utils import timezone

from apps.analytics.models import JobViewEvent
from apps.analytics.selectors.employer_analytics import (
    MIN_RELIABLE_VIEWS,
    employer_analytics,
)
from apps.applications.models import Application, ApplicationStatus
from apps.jobs.models import Job

from .conftest import PASSWORD

VALID_PDF = b"%PDF-1.4\nsynthetic\n%%EOF\n"


def _publish(employer, title="Role", published_at=None) -> Job:
    return Job.objects.create(
        employer=employer,
        title=title,
        status=Job.Status.PUBLISHED,
        published_at=published_at or timezone.now(),
    )


def _apply(candidate, job, *, status=ApplicationStatus.APPLIED, submitted_at=None) -> Application:
    app = Application(
        job=job,
        candidate=candidate,
        cover_letter="Consider me.",
        status=status,
        resume_snapshot_name="cv.pdf",
    )
    app.resume_file_snapshot.save("cv.pdf", ContentFile(VALID_PDF), save=False)
    app.save()
    if submitted_at is not None:
        Application.objects.filter(pk=app.pk).update(submitted_at=submitted_at)
        app.refresh_from_db()
    return app


def _view(job, *, n=1):
    for _ in range(n):
        JobViewEvent.objects.create(job=job)


@pytest.mark.django_db
def test_scoped_strictly_to_own_jobs(make_employer, make_candidate):
    me = make_employer()
    rival = make_employer()
    candidate = make_candidate()

    my_job = _publish(me, "My Role")
    rival_job = _publish(rival, "Rival Role")
    _apply(candidate, my_job)
    _apply(make_candidate(), rival_job)
    _view(my_job, n=3)
    _view(rival_job, n=5)

    data = employer_analytics(me)
    # Only my job's views/applications are counted.
    assert data["views"]["total"] == 3
    assert data["applications"]["total"] == 1
    assert data["jobs"]["total"] == 1


@pytest.mark.django_db
def test_conversion_null_when_views_unreliable(make_employer, make_candidate):
    me = make_employer()
    job = _publish(me)
    _apply(make_candidate(), job)
    _view(job, n=1)  # below MIN_RELIABLE_VIEWS

    data = employer_analytics(me)
    assert data["views"]["reliable"] is False
    assert data["application_conversion_rate"] is None


@pytest.mark.django_db
def test_conversion_computed_when_reliable(make_employer, make_candidate):
    me = make_employer()
    job = _publish(me)
    _view(job, n=MIN_RELIABLE_VIEWS)
    for _ in range(2):
        _apply(make_candidate(), job)

    data = employer_analytics(me)
    assert data["views"]["reliable"] is True
    assert data["application_conversion_rate"] == round(2 / MIN_RELIABLE_VIEWS, 4)


@pytest.mark.django_db
def test_time_to_first_application(make_employer, make_candidate):
    me = make_employer()
    published = timezone.now() - timedelta(hours=10)
    job = _publish(me, published_at=published)
    # First application 2 hours after publish; a later one must not change it.
    _apply(make_candidate(), job, submitted_at=published + timedelta(hours=2))
    _apply(make_candidate(), job, submitted_at=published + timedelta(hours=8))

    data = employer_analytics(me)
    ttfa = data["time_to_first_application_seconds"]
    assert ttfa == pytest.approx(2 * 3600, abs=5)


@pytest.mark.django_db
def test_time_to_first_null_without_applications(make_employer):
    me = make_employer()
    _publish(me)
    data = employer_analytics(me)
    assert data["time_to_first_application_seconds"] is None


@pytest.mark.django_db
def test_stage_distribution(make_employer, make_candidate):
    me = make_employer()
    job = _publish(me)
    _apply(make_candidate(), job, status=ApplicationStatus.APPLIED)
    _apply(make_candidate(), job, status=ApplicationStatus.SHORTLISTED)
    _apply(make_candidate(), job, status=ApplicationStatus.SHORTLISTED)

    data = employer_analytics(me)
    dist = data["stage_distribution"]
    assert dist["APPLIED"] == 1
    assert dist["SHORTLISTED"] == 2
    assert dist["HIRED"] == 0
    # Every stage key present (no missing stage).
    assert set(dist.keys()) == {s.value for s in ApplicationStatus}


@pytest.mark.django_db
def test_endpoint_returns_no_candidate_identities(api, make_employer, make_candidate):
    me = make_employer()
    job = _publish(me)
    candidate = make_candidate(email="secret-applicant@example.com")
    _apply(candidate, job)

    api.login(email=me.user.email, password=PASSWORD)
    resp = api.get(reverse("analytics-employer:employer-analytics"))
    assert resp.status_code == 200
    body = str(resp.data)
    # No individual candidate identity must appear anywhere in the payload.
    assert "secret-applicant@example.com" not in body
    assert "Synthetic Candidate" not in body


@pytest.mark.django_db
def test_endpoint_requires_approved_employer(api, make_candidate):
    candidate = make_candidate()
    api.login(email=candidate.user.email, password=PASSWORD)
    resp = api.get(reverse("analytics-employer:employer-analytics"))
    assert resp.status_code in (401, 403)
