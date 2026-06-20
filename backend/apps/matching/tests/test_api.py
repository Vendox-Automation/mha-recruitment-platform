"""Tests for the candidate-facing Job Fit endpoints (spec §16.6, §21.6, §22.3)."""

from __future__ import annotations

import pytest

from apps.jobs.models import Job
from apps.matching import ai
from apps.matching.models import JobFitResult

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _clear_override():
    ai.set_provider_override(None)
    yield
    ai.set_provider_override(None)


def _fit_url(job: Job) -> str:
    return f"/api/v1/jobs/{job.slug}/fit/"


def _regen_url(job: Job) -> str:
    return f"/api/v1/jobs/{job.slug}/fit/regenerate/"


def test_get_fit_requires_authentication(api, make_job):
    job = make_job()
    resp = api.get(_fit_url(job))
    assert resp.status_code in (401, 403)


def test_get_fit_forbidden_for_employer(api, make_job, approved_employer):
    job = make_job()
    api.force_authenticate(user=approved_employer.user)
    resp = api.get(_fit_url(job))
    assert resp.status_code == 403


def test_get_fit_computes_and_caches(api, make_candidate, make_job):
    candidate = make_candidate()
    job = make_job()
    api.force_authenticate(user=candidate.user)
    resp = api.get(_fit_url(job))
    assert resp.status_code == 200
    body = resp.json()
    assert "score" in body
    assert "band" in body
    assert "matched" in body and "gaps" in body and "unknown" in body
    assert JobFitResult.objects.filter(candidate=candidate, job=job).count() == 1
    # Second GET reuses the cached result (still exactly one row).
    api.get(_fit_url(job))
    assert JobFitResult.objects.filter(candidate=candidate, job=job).count() == 1


def test_disclaimer_always_present_on_get(api, make_candidate, make_job):
    candidate = make_candidate()
    job = make_job()
    api.force_authenticate(user=candidate.user)
    body = api.get(_fit_url(job)).json()
    assert body["disclaimer"] == ai.DISCLAIMER


def test_disclaimer_always_present_on_regenerate(api, make_candidate, make_job):
    candidate = make_candidate()
    job = make_job()
    api.force_authenticate(user=candidate.user)
    body = api.post(_regen_url(job)).json()
    assert body["disclaimer"] == ai.DISCLAIMER


def test_404_for_non_public_job(api, make_candidate, make_job):
    candidate = make_candidate()
    draft = make_job(status=Job.Status.DRAFT, published_at=None)
    api.force_authenticate(user=candidate.user)
    assert api.get(_fit_url(draft)).status_code == 404
    assert api.post(_regen_url(draft)).status_code == 404


def test_404_for_unknown_slug(api, make_candidate):
    candidate = make_candidate()
    api.force_authenticate(user=candidate.user)
    assert api.get("/api/v1/jobs/does-not-exist/fit/").status_code == 404


def test_regenerate_recomputes_and_updates(api, make_candidate, make_job):
    candidate = make_candidate()
    job = make_job()
    api.force_authenticate(user=candidate.user)
    first = api.get(_fit_url(job)).json()
    first_ts = first["generated_at"]

    # Change a preference, then regenerate -> fresh result.
    candidate.preferred_location = "Penang"  # now mismatches job location
    candidate.save(update_fields=["preferred_location"])
    second = api.post(_regen_url(job)).json()

    assert second["generated_at"] >= first_ts
    assert second["score"] <= first["score"]  # losing the location match
    assert JobFitResult.objects.filter(candidate=candidate, job=job).count() == 1


def test_response_never_leaks_storage_path(api, make_candidate, make_job):
    candidate = make_candidate()
    job = make_job()
    api.force_authenticate(user=candidate.user)
    body = api.get(_fit_url(job)).json()
    assert "resume_file" not in body
    assert "candidate" not in body
    assert "url" not in body
