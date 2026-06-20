"""Job lifecycle transition tests (publish/close/reopen) (spec §14.11)."""

from __future__ import annotations

import pytest
from django.urls import reverse

from apps.jobs.models import Job


def url(name, pk):
    return reverse(f"jobs:employer-job-{name}", args=[pk])


@pytest.mark.django_db
def test_publish_draft_sets_published_at(make_employer, make_job, api):
    a = make_employer()
    job = make_job(employer=a.employer_profile, status=Job.Status.DRAFT, published_at=None)
    api.force_authenticate(user=a)
    resp = api.post(url("publish", job.pk))
    assert resp.status_code == 200
    job.refresh_from_db()
    assert job.status == Job.Status.PUBLISHED
    assert job.published_at is not None


@pytest.mark.django_db
def test_close_sets_closed_at(make_employer, make_job, api):
    a = make_employer()
    job = make_job(employer=a.employer_profile, status=Job.Status.PUBLISHED)
    api.force_authenticate(user=a)
    resp = api.post(url("close", job.pk))
    assert resp.status_code == 200
    job.refresh_from_db()
    assert job.status == Job.Status.CLOSED
    assert job.closed_at is not None


@pytest.mark.django_db
def test_reopen_closed_job(make_employer, make_job, api):
    a = make_employer()
    job = make_job(employer=a.employer_profile, status=Job.Status.CLOSED)
    api.force_authenticate(user=a)
    resp = api.post(url("reopen", job.pk))
    assert resp.status_code == 200
    job.refresh_from_db()
    assert job.status == Job.Status.PUBLISHED
    assert job.published_at is not None
    assert job.closed_at is None


@pytest.mark.django_db
def test_cannot_publish_already_published(make_employer, make_job, api):
    a = make_employer()
    job = make_job(employer=a.employer_profile, status=Job.Status.PUBLISHED)
    api.force_authenticate(user=a)
    assert api.post(url("publish", job.pk)).status_code == 400


@pytest.mark.django_db
def test_cannot_reopen_draft(make_employer, make_job, api):
    a = make_employer()
    job = make_job(employer=a.employer_profile, status=Job.Status.DRAFT, published_at=None)
    api.force_authenticate(user=a)
    assert api.post(url("reopen", job.pk)).status_code == 400


@pytest.mark.django_db
def test_cannot_publish_with_past_deadline(make_employer, make_job, api, past_date):
    a = make_employer()
    job = make_job(
        employer=a.employer_profile,
        status=Job.Status.DRAFT,
        published_at=None,
        application_deadline=past_date,
    )
    api.force_authenticate(user=a)
    resp = api.post(url("publish", job.pk))
    assert resp.status_code == 400
    job.refresh_from_db()
    assert job.status == Job.Status.DRAFT


@pytest.mark.django_db
def test_cannot_transition_other_employers_job(make_employer, make_job, api):
    a = make_employer(email="a@example.com")
    b = make_employer(email="b@example.com")
    b_job = make_job(employer=b.employer_profile, status=Job.Status.DRAFT, published_at=None)
    api.force_authenticate(user=a)
    assert api.post(url("publish", b_job.pk)).status_code == 404
