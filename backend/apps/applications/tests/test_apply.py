"""Apply-flow tests: resume requirement, uniqueness, screening validation."""

from __future__ import annotations

import pytest

from apps.jobs.models import Job, ScreeningQuestion

from ..models import Application, ApplicationStatus, ApplicationStatusHistory
from .conftest import add_question


def _apply_url(job: Job) -> str:
    return f"/api/v1/jobs/{job.slug}/apply/"


@pytest.mark.django_db
def test_apply_success_creates_application_history_and_snapshot(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    api = login(profile)

    response = api.post(_apply_url(job), {"cover_letter": "Keen to join."}, format="json")
    assert response.status_code == 201

    application = Application.objects.get(job=job, candidate=profile)
    assert application.status == ApplicationStatus.APPLIED
    assert application.cover_letter == "Keen to join."
    assert application.resume_file_snapshot  # immutable snapshot stored
    history = ApplicationStatusHistory.objects.filter(application=application)
    assert history.count() == 1
    assert history.first().from_status is None
    assert history.first().to_status == ApplicationStatus.APPLIED


@pytest.mark.django_db
def test_cannot_apply_without_resume(login, make_candidate, make_job):
    profile = make_candidate(with_resume=False)
    job = make_job()
    api = login(profile)
    response = api.post(_apply_url(job), {}, format="json")
    assert response.status_code == 400
    assert "resume" in (response.json().get("fields") or {})


@pytest.mark.django_db
def test_duplicate_application_returns_conflict(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    api = login(profile)
    assert api.post(_apply_url(job), {}, format="json").status_code == 201
    dup = api.post(_apply_url(job), {}, format="json")
    assert dup.status_code == 409
    assert dup.json()["code"] == "conflict"


@pytest.mark.django_db
def test_required_screening_answer_enforced(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    question = add_question(job, qtype=ScreeningQuestion.QuestionType.NUMBER, required=True)
    api = login(profile)

    # Missing required answer -> rejected.
    missing = api.post(_apply_url(job), {"answers": {}}, format="json")
    assert missing.status_code == 400

    # Invalid (non-numeric) -> rejected.
    invalid = api.post(_apply_url(job), {"answers": {str(question.id): "abc"}}, format="json")
    assert invalid.status_code == 400

    # Valid numeric -> accepted.
    ok = api.post(_apply_url(job), {"answers": {str(question.id): 5}}, format="json")
    assert ok.status_code == 201
    assert Application.objects.get(job=job, candidate=profile).answers.count() == 1


@pytest.mark.django_db
def test_single_choice_answer_must_be_an_option(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    q = add_question(
        job,
        qtype=ScreeningQuestion.QuestionType.SINGLE_CHOICE,
        required=True,
        options=["A", "B"],
    )
    api = login(profile)
    assert (
        api.post(_apply_url(job), {"answers": {str(q.id): "Z"}}, format="json").status_code == 400
    )
    assert (
        api.post(_apply_url(job), {"answers": {str(q.id): "A"}}, format="json").status_code == 201
    )


@pytest.mark.django_db
def test_optional_question_may_be_blank(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    add_question(job, qtype=ScreeningQuestion.QuestionType.SHORT_TEXT, required=False)
    api = login(profile)
    assert api.post(_apply_url(job), {"answers": {}}, format="json").status_code == 201


@pytest.mark.django_db
def test_cannot_apply_to_non_public_job(login, make_candidate, make_job):
    profile = make_candidate()
    draft = make_job(status=Job.Status.DRAFT, published_at=None)
    api = login(profile)
    assert api.post(_apply_url(draft), {}, format="json").status_code == 404
