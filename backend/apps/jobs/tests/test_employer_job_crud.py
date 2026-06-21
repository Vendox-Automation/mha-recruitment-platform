"""Employer job CRUD + object-level ownership boundary tests (spec §22.1)."""

from __future__ import annotations

import pytest
from django.urls import reverse

from apps.accounts.models import User
from apps.employers.models import EmployerProfile
from apps.jobs.models import Job

LIST_URL = reverse("jobs:employer-job-list")


def detail_url(pk):
    return reverse("jobs:employer-job-detail", args=[pk])


@pytest.mark.django_db
def test_create_job_defaults_to_draft_and_scopes_owner(make_employer, api):
    user = make_employer()
    api.force_authenticate(user=user)
    resp = api.post(
        LIST_URL,
        {
            "title": "Backend Engineer",
            "location": "Penang",
            "employment_type": Job.EmploymentType.FULL_TIME,
            "description": "Build APIs.",
            "requirements": "Django.",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data
    job = Job.objects.get(slug=resp.data["slug"])
    assert job.status == Job.Status.DRAFT
    assert job.employer == user.employer_profile
    assert job.created_by == user
    assert job.source_type == Job.SourceType.EMPLOYER_PARTNER


@pytest.mark.django_db
def test_create_ignores_server_owned_fields(make_employer, api):
    """A payload cannot self-publish, self-support, or attach to another owner."""
    user = make_employer()
    api.force_authenticate(user=user)
    resp = api.post(
        LIST_URL,
        {
            "title": "Sneaky Job",
            "status": Job.Status.PUBLISHED,
            "is_mha_supported": True,
            "source_type": Job.SourceType.MHA_DIRECT,
        },
        format="json",
    )
    assert resp.status_code == 201
    job = Job.objects.get(slug=resp.data["slug"])
    assert job.status == Job.Status.DRAFT
    assert job.is_mha_supported is False
    assert job.source_type == Job.SourceType.EMPLOYER_PARTNER


@pytest.mark.django_db
def test_list_returns_only_own_jobs(make_employer, make_job, api):
    a = make_employer(email="a@example.com")
    b = make_employer(email="b@example.com")
    make_job(employer=a.employer_profile, title="A job")
    make_job(employer=b.employer_profile, title="B job")
    api.force_authenticate(user=a)
    resp = api.get(LIST_URL)
    assert resp.status_code == 200
    titles = {row["title"] for row in resp.data["results"]}
    assert titles == {"A job"}


@pytest.mark.django_db
def test_employer_cannot_read_other_employers_job(make_employer, make_job, api):
    a = make_employer(email="a@example.com")
    b = make_employer(email="b@example.com")
    b_job = make_job(employer=b.employer_profile)
    api.force_authenticate(user=a)
    assert api.get(detail_url(b_job.pk)).status_code == 404


@pytest.mark.django_db
def test_employer_cannot_edit_other_employers_job(make_employer, make_job, api):
    a = make_employer(email="a@example.com")
    b = make_employer(email="b@example.com")
    b_job = make_job(employer=b.employer_profile, title="Untouched")
    api.force_authenticate(user=a)
    resp = api.patch(detail_url(b_job.pk), {"title": "Hijacked"}, format="json")
    assert resp.status_code == 404
    b_job.refresh_from_db()
    assert b_job.title == "Untouched"


@pytest.mark.django_db
def test_employer_cannot_touch_mha_owned_job(make_employer, make_job, api):
    a = make_employer()
    mha_job = make_job(employer=None, title="MHA job")  # employer null
    api.force_authenticate(user=a)
    assert api.get(detail_url(mha_job.pk)).status_code == 404
    assert api.patch(detail_url(mha_job.pk), {"title": "x"}, format="json").status_code == 404
    assert api.post(reverse("jobs:employer-job-publish", args=[mha_job.pk])).status_code == 404


@pytest.mark.django_db
def test_employer_can_edit_own_draft(make_employer, make_job, api):
    a = make_employer()
    job = make_job(employer=a.employer_profile, status=Job.Status.DRAFT, published_at=None)
    api.force_authenticate(user=a)
    resp = api.patch(detail_url(job.pk), {"title": "Updated"}, format="json")
    assert resp.status_code == 200
    job.refresh_from_db()
    assert job.title == "Updated"


@pytest.mark.django_db
def test_cannot_edit_suspended_job(make_employer, make_job, api):
    a = make_employer()
    job = make_job(employer=a.employer_profile, status=Job.Status.SUSPENDED)
    api.force_authenticate(user=a)
    resp = api.patch(detail_url(job.pk), {"title": "Nope"}, format="json")
    assert resp.status_code == 400
    job.refresh_from_db()
    assert job.title != "Nope"


@pytest.mark.django_db
def test_pending_employer_cannot_create(make_employer, api):
    user = make_employer(
        status=User.Status.PENDING, approval_status=EmployerProfile.ApprovalStatus.PENDING
    )
    api.force_authenticate(user=user)
    resp = api.post(LIST_URL, {"title": "x"}, format="json")
    assert resp.status_code == 403


@pytest.mark.django_db
def test_candidate_cannot_access_employer_jobs(make_candidate, api):
    api.force_authenticate(user=make_candidate())
    assert api.get(LIST_URL).status_code == 403


@pytest.mark.django_db
def test_anonymous_denied(api):
    assert api.get(LIST_URL).status_code in (401, 403)


@pytest.mark.django_db
def test_salary_validation_min_greater_than_max(make_employer, api):
    user = make_employer()
    api.force_authenticate(user=user)
    resp = api.post(
        LIST_URL,
        {"title": "Bad salary", "salary_min": "9000", "salary_max": "5000"},
        format="json",
    )
    assert resp.status_code == 400
    assert "salary_min" in resp.data.get("fields", {})


@pytest.mark.django_db
def test_screening_questions_created_and_ordered(make_employer, api):
    user = make_employer()
    api.force_authenticate(user=user)
    resp = api.post(
        LIST_URL,
        {
            "title": "With questions",
            "screening_questions": [
                {"question": "Years of SQL?", "question_type": "NUMBER", "display_order": 1},
                {
                    "question": "Tell us about yourself",
                    "question_type": "LONG_TEXT",
                    "display_order": 0,
                },
            ],
        },
        format="json",
    )
    assert resp.status_code == 201, resp.data
    job = Job.objects.get(slug=resp.data["slug"])
    ordered = list(job.screening_questions.values_list("question", flat=True))
    assert ordered == ["Tell us about yourself", "Years of SQL?"]


@pytest.mark.django_db
def test_single_choice_requires_two_options(make_employer, api):
    user = make_employer()
    api.force_authenticate(user=user)
    resp = api.post(
        LIST_URL,
        {
            "title": "Choice job",
            "screening_questions": [
                {
                    "question": "Pick one",
                    "question_type": "SINGLE_CHOICE",
                    "options_json": ["only"],
                },
            ],
        },
        format="json",
    )
    assert resp.status_code == 400
