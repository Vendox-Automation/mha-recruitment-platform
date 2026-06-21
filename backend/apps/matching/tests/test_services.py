"""Tests for the Job Fit orchestration service (spec §16, §20.11)."""

from __future__ import annotations

import pytest
from django.core.files.base import ContentFile

from apps.matching import ai, engine
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


def test_ai_disabled_stores_empty_explanation_and_codes(make_candidate, make_job, settings):
    # With AI disabled (the MVP default) no backend prose is stored — the engine
    # emits stable reason codes and the frontend builds localized prose (spec §17).
    settings.AI_JOB_FIT_ENABLED = False
    candidate = make_candidate()
    job = make_job()
    result = compute_job_fit(candidate, job)
    assert result.ai_enabled is False
    assert result.ai_provider == ""
    assert result.ai_model == ""
    assert result.ai_explanation == ""
    # Reasons are stable codes, not prose.
    for code in result.matched_json:
        assert code in engine.MATCHED_CODES
    for code in result.unknown_json:
        assert code in engine.UNKNOWN_CODES


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
    # Provider failure → not marked ai_enabled, no prose stored; the engine score
    # is untouched and the frontend builds wording from the reason codes.
    assert result.ai_enabled is False
    assert result.ai_provider == ""
    assert result.ai_model == ""
    assert result.score > 0
    assert result.ai_explanation == ""
