"""Public job search/detail tests: visibility, filters, sorts, pagination."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone

from apps.jobs.models import Job

LIST_URL = reverse("jobs-public:public-job-list")


def detail_url(slug):
    return reverse("jobs-public:public-job-detail", args=[slug])


@pytest.mark.django_db
def test_only_published_appear(make_employer, make_job, api):
    e = make_employer()
    make_job(employer=e.employer_profile, title="Visible", status=Job.Status.PUBLISHED)
    for hidden in (
        Job.Status.DRAFT,
        Job.Status.CLOSED,
        Job.Status.SUSPENDED,
        Job.Status.ARCHIVED,
        Job.Status.EXPIRED,
    ):
        make_job(employer=e.employer_profile, title=f"Hidden-{hidden}", status=hidden)
    resp = api.get(LIST_URL)
    assert resp.status_code == 200
    titles = {row["title"] for row in resp.data["results"]}
    assert titles == {"Visible"}


@pytest.mark.django_db
def test_expired_by_deadline_excluded(make_employer, make_job, api):
    e = make_employer()
    yesterday = timezone.localdate() - timedelta(days=1)
    make_job(
        employer=e.employer_profile,
        title="Deadline passed",
        status=Job.Status.PUBLISHED,
        application_deadline=yesterday,
    )
    make_job(
        employer=e.employer_profile,
        title="Still open",
        status=Job.Status.PUBLISHED,
        application_deadline=timezone.localdate() + timedelta(days=5),
    )
    resp = api.get(LIST_URL)
    titles = {row["title"] for row in resp.data["results"]}
    assert titles == {"Still open"}


@pytest.mark.django_db
def test_anonymous_allowed(make_employer, make_job, api):
    e = make_employer()
    make_job(employer=e.employer_profile)
    assert api.get(LIST_URL).status_code == 200


@pytest.mark.django_db
def test_keyword_filter(make_employer, make_job, api):
    e = make_employer()
    make_job(
        employer=e.employer_profile,
        title="Python Developer",
        description="Work on data tooling.",
        requirements="Strong programming skills.",
    )
    make_job(
        employer=e.employer_profile,
        title="Marketing Lead",
        description="Own brand campaigns.",
        requirements="Marketing experience.",
    )
    resp = api.get(LIST_URL, {"keyword": "python"})
    titles = {row["title"] for row in resp.data["results"]}
    assert titles == {"Python Developer"}


@pytest.mark.django_db
def test_location_filter(make_employer, make_job, api):
    e = make_employer()
    make_job(employer=e.employer_profile, title="KL job", location="Kuala Lumpur")
    make_job(employer=e.employer_profile, title="JB job", location="Johor Bahru")
    resp = api.get(LIST_URL, {"location": "johor"})
    titles = {row["title"] for row in resp.data["results"]}
    assert titles == {"JB job"}


@pytest.mark.django_db
def test_employment_type_filter(make_employer, make_job, api):
    e = make_employer()
    make_job(employer=e.employer_profile, title="FT", employment_type=Job.EmploymentType.FULL_TIME)
    make_job(
        employer=e.employer_profile, title="Intern", employment_type=Job.EmploymentType.INTERNSHIP
    )
    resp = api.get(LIST_URL, {"employment_type": Job.EmploymentType.INTERNSHIP})
    titles = {row["title"] for row in resp.data["results"]}
    assert titles == {"Intern"}


@pytest.mark.django_db
def test_salary_filter_boundary_overlap(make_employer, make_job, api):
    e = make_employer()
    make_job(
        employer=e.employer_profile,
        title="Low",
        salary_disclosed=True,
        salary_min=3000,
        salary_max=4000,
    )
    make_job(
        employer=e.employer_profile,
        title="High",
        salary_disclosed=True,
        salary_min=8000,
        salary_max=10000,
    )
    # Want 5000-9000: overlaps High only.
    resp = api.get(LIST_URL, {"salary_min": "5000", "salary_max": "9000"})
    titles = {row["title"] for row in resp.data["results"]}
    assert titles == {"High"}


@pytest.mark.django_db
def test_salary_filter_includes_undisclosed(make_employer, make_job, api):
    e = make_employer()
    make_job(
        employer=e.employer_profile,
        title="Undisclosed",
        salary_disclosed=False,
        salary_min=None,
        salary_max=None,
    )
    resp = api.get(LIST_URL, {"salary_min": "5000"})
    titles = {row["title"] for row in resp.data["results"]}
    assert "Undisclosed" in titles


@pytest.mark.django_db
def test_undisclosed_salary_not_exposed(make_employer, make_job, api):
    e = make_employer()
    make_job(
        employer=e.employer_profile,
        title="Secret pay",
        salary_disclosed=False,
        salary_min=5000,
        salary_max=9000,
    )
    resp = api.get(LIST_URL)
    row = resp.data["results"][0]
    assert row["salary_min"] is None
    assert row["salary_max"] is None


@pytest.mark.django_db
def test_sort_newest(make_employer, make_job, api):
    e = make_employer()
    now = timezone.now()
    make_job(employer=e.employer_profile, title="Older", published_at=now - timedelta(days=2))
    make_job(employer=e.employer_profile, title="Newer", published_at=now)
    resp = api.get(LIST_URL, {"sort": "newest"})
    titles = [row["title"] for row in resp.data["results"]]
    assert titles.index("Newer") < titles.index("Older")


@pytest.mark.django_db
def test_sort_relevant_title_match_first(make_employer, make_job, api):
    e = make_employer()
    make_job(
        employer=e.employer_profile,
        title="Generic role",
        description="We need a data analyst person.",
    )
    make_job(employer=e.employer_profile, title="Data Analyst", description="Generic.")
    resp = api.get(LIST_URL, {"sort": "relevant", "keyword": "data analyst"})
    titles = [row["title"] for row in resp.data["results"]]
    assert titles[0] == "Data Analyst"


@pytest.mark.django_db
def test_pagination_envelope(make_employer, make_job, api):
    e = make_employer()
    for i in range(3):
        make_job(employer=e.employer_profile, title=f"Job {i}")
    resp = api.get(LIST_URL, {"page_size": 2})
    assert {"count", "next", "previous", "results"}.issubset(resp.data.keys())
    assert resp.data["count"] == 3
    assert len(resp.data["results"]) == 2


@pytest.mark.django_db
def test_detail_public_job(make_employer, make_job, api):
    e = make_employer()
    job = make_job(employer=e.employer_profile, title="Detail job")
    resp = api.get(detail_url(job.slug))
    assert resp.status_code == 200
    assert resp.data["title"] == "Detail job"
    assert resp.data["company"]["company_name"] == "Synthetic Co"


@pytest.mark.django_db
def test_detail_404_for_non_public(make_employer, make_job, api):
    e = make_employer()
    job = make_job(employer=e.employer_profile, status=Job.Status.DRAFT, published_at=None)
    assert api.get(detail_url(job.slug)).status_code == 404


@pytest.mark.django_db
def test_detail_screening_questions_ordered(make_employer, make_job, api):
    from apps.jobs.models import ScreeningQuestion

    e = make_employer()
    job = make_job(employer=e.employer_profile)
    ScreeningQuestion.objects.create(job=job, question="Second", display_order=1)
    ScreeningQuestion.objects.create(job=job, question="First", display_order=0)
    resp = api.get(detail_url(job.slug))
    questions = [q["question"] for q in resp.data["screening_questions"]]
    assert questions == ["First", "Second"]
