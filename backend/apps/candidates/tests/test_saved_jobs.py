"""Saved-job behaviour + object-level scoping tests (spec §15.5, §20.9)."""

from __future__ import annotations

import pytest
from django.urls import reverse

from apps.candidates.models import SavedJob
from apps.candidates.selectors import saved_jobs_stats
from apps.employers.models import EmployerProfile
from apps.jobs.models import Job

from .conftest import PASSWORD


def _make_public_job(employer: EmployerProfile | None = None, title="Data Analyst") -> Job:
    return Job.objects.create(
        employer=employer,
        title=title,
        status=Job.Status.PUBLISHED,
        location="Kuala Lumpur",
    )


@pytest.fixture
def candidate(make_candidate):
    return make_candidate()


@pytest.fixture
def auth(api, candidate):
    api.login(email=candidate.email, password=PASSWORD)
    return api


@pytest.mark.django_db
def test_save_list_and_delete(auth, candidate):
    job = _make_public_job()

    # Save by id.
    resp = auth.post(reverse("candidates:saved-jobs"), {"job": str(job.id)})
    assert resp.status_code == 201
    assert resp.data["job"]["slug"] == job.slug
    assert resp.data["is_available"] is True

    # List shows the saved job.
    resp = auth.get(reverse("candidates:saved-jobs"))
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]["job"]["title"] == "Data Analyst"

    # Delete by JOB id.
    resp = auth.delete(reverse("candidates:saved-job-detail", args=[str(job.id)]))
    assert resp.status_code == 204
    assert not SavedJob.objects.filter(job=job).exists()


@pytest.mark.django_db
def test_save_by_slug(auth):
    job = _make_public_job()
    resp = auth.post(reverse("candidates:saved-jobs"), {"job": job.slug})
    assert resp.status_code == 201
    assert SavedJob.objects.filter(job=job).count() == 1


@pytest.mark.django_db
def test_duplicate_save_is_idempotent_200(auth):
    job = _make_public_job()
    first = auth.post(reverse("candidates:saved-jobs"), {"job": str(job.id)})
    assert first.status_code == 201
    second = auth.post(reverse("candidates:saved-jobs"), {"job": str(job.id)})
    # Documented contract: a repeat save is a 200 no-op, never a duplicate row.
    assert second.status_code == 200
    assert SavedJob.objects.filter(job=job).count() == 1


@pytest.mark.django_db
def test_cannot_save_non_public_job(auth):
    draft = Job.objects.create(title="Hidden", status=Job.Status.DRAFT)
    resp = auth.post(reverse("candidates:saved-jobs"), {"job": str(draft.id)})
    assert resp.status_code == 400
    assert "job" in resp.data["fields"]
    assert not SavedJob.objects.filter(job=draft).exists()


@pytest.mark.django_db
def test_is_available_flips_when_unpublished(auth):
    job = _make_public_job()
    auth.post(reverse("candidates:saved-jobs"), {"job": str(job.id)})

    # Job leaves public() — still listed, but flagged unavailable (not hidden).
    job.status = Job.Status.CLOSED
    job.save(update_fields=["status"])

    resp = auth.get(reverse("candidates:saved-jobs"))
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]["is_available"] is False


@pytest.mark.django_db
def test_saved_jobs_are_owner_scoped(api, make_candidate):
    owner = make_candidate(email="owner@example.com")
    other = make_candidate(email="other@example.com")
    job = _make_public_job()
    SavedJob.objects.create(candidate=owner.candidate_profile, job=job)

    api.login(email=other.email, password=PASSWORD)
    # The other candidate sees an empty list...
    resp = api.get(reverse("candidates:saved-jobs"))
    assert resp.status_code == 200
    assert resp.data == []
    # ...and cannot delete the owner's bookmark (404, no existence leak).
    resp = api.delete(reverse("candidates:saved-job-detail", args=[str(job.id)]))
    assert resp.status_code == 404
    assert SavedJob.objects.filter(candidate=owner.candidate_profile, job=job).exists()


@pytest.mark.django_db
def test_dashboard_count_is_real(auth, candidate):
    profile = candidate.candidate_profile
    available_job = _make_public_job(title="Open Role")
    closed_job = _make_public_job(title="Closed Role")
    SavedJob.objects.create(candidate=profile, job=available_job)
    SavedJob.objects.create(candidate=profile, job=closed_job)
    closed_job.status = Job.Status.CLOSED
    closed_job.save(update_fields=["status"])

    stats = saved_jobs_stats(profile)
    assert stats == {"total": 2, "available": 1}

    resp = auth.get(reverse("candidates:dashboard"))
    assert resp.data["saved_jobs"] == {"total": 2, "available": 1}


@pytest.mark.django_db
def test_anonymous_cannot_use_saved_jobs(api):
    resp = api.get(reverse("candidates:saved-jobs"))
    assert resp.status_code in (401, 403)
