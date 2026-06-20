"""Tests for the Job Fit orchestration service (spec §16, §20.11)."""

from __future__ import annotations

import pytest
from django.core.files.base import ContentFile

from apps.matching import ai
from apps.matching.models import JobFitResult
from apps.matching.services import compute_job_fit
from apps.matching.tests.conftest import docx_bytes

pytestmark = pytest.mark.django_db


@pytest.fixture(autouse=True)
def _clear_override():
    ai.set_provider_override(None)
    yield
    ai.set_provider_override(None)


def test_compute_upserts_single_result(make_candidate, make_job):
    candidate = make_candidate()
    job = make_job()
    first = compute_job_fit(candidate, job)
    second = compute_job_fit(candidate, job)
    assert first.pk == second.pk
    assert JobFitResult.objects.filter(candidate=candidate, job=job).count() == 1


def test_unique_constraint_one_result_per_pair(make_candidate, make_job):
    candidate = make_candidate()
    job = make_job()
    compute_job_fit(candidate, job)
    compute_job_fit(candidate, job)
    assert JobFitResult.objects.count() == 1


def test_regenerate_updates_generated_at(make_candidate, make_job):
    candidate = make_candidate()
    job = make_job()
    first = compute_job_fit(candidate, job)
    ts1 = first.generated_at
    second = compute_job_fit(candidate, job)
    assert second.generated_at >= ts1


def test_resume_keywords_feed_overlap(make_candidate, make_job):
    candidate = make_candidate(
        preferred_location="",  # exclude to isolate signal
        preferred_employment_type="",
        preferred_job_title="",
    )
    candidate.resume_file.save("cv.docx", ContentFile(docx_bytes("SQL Python Tableau")))
    job = make_job(requirements="SQL Python Tableau reporting")
    result = compute_job_fit(candidate, job)
    # 3 of 4 requirement keywords (sql/python/tableau; "reporting" missing).
    assert result.score == 75
    assert candidate.resume_extracted_keywords_json  # cached


def test_ai_disabled_uses_deterministic_fallback(make_candidate, make_job, settings):
    settings.AI_JOB_FIT_ENABLED = False
    candidate = make_candidate()
    job = make_job()
    result = compute_job_fit(candidate, job)
    assert result.ai_enabled is False
    assert result.ai_provider == ""
    assert result.ai_model == ""
    assert str(result.score) + "%" in result.ai_explanation


def test_mock_provider_cannot_change_score(make_candidate, make_job, settings):
    settings.AI_JOB_FIT_ENABLED = True
    ai.set_provider_override(ai.MockProvider())
    candidate = make_candidate()
    job = make_job()
    # Engine score with perfect prefs/resume is deterministic; capture it via a
    # disabled run first for comparison.
    settings.AI_JOB_FIT_ENABLED = False
    baseline = compute_job_fit(candidate, job).score
    settings.AI_JOB_FIT_ENABLED = True
    result = compute_job_fit(candidate, job)
    assert result.ai_enabled is True
    assert result.ai_provider == "mock"
    assert result.ai_model == "mock-1"
    assert result.score == baseline  # AI did NOT move the score
    assert result.ai_explanation.startswith("[AI]")


def test_failing_provider_falls_back(make_candidate, make_job, settings):
    class BoomProvider:
        name = "boom"
        model = "boom-1"

        def generate_explanation(self, **kwargs):
            raise RuntimeError("provider down")

    settings.AI_JOB_FIT_ENABLED = True
    ai.set_provider_override(BoomProvider())
    candidate = make_candidate()
    job = make_job()
    result = compute_job_fit(candidate, job)
    # Fell back to deterministic copy; not marked ai_enabled.
    assert result.ai_enabled is False
    assert result.score > 0
    assert str(result.score) + "%" in result.ai_explanation
