"""Public company directory tests (spec §14.4, §21.7)."""

from __future__ import annotations

import pytest
from django.urls import reverse

from apps.employers.models import EmployerProfile
from apps.jobs.models import Job

LIST_URL = reverse("companies:company-list")


def detail_url(slug):
    return reverse("companies:company-detail", args=[slug])


@pytest.mark.django_db
def test_only_approved_companies_listed(make_employer, api):
    make_employer(email="ok@example.com", company_name="Approved Co")
    make_employer(
        email="pending@example.com",
        company_name="Pending Co",
        approval_status=EmployerProfile.ApprovalStatus.PENDING,
    )
    resp = api.get(LIST_URL)
    assert resp.status_code == 200
    names = {row["company_name"] for row in resp.data["results"]}
    assert names == {"Approved Co"}


@pytest.mark.django_db
def test_active_job_count_only_counts_public(make_employer, make_job, api):
    e = make_employer(company_name="Counter Co")
    make_job(employer=e.employer_profile, status=Job.Status.PUBLISHED)
    make_job(employer=e.employer_profile, status=Job.Status.PUBLISHED)
    make_job(employer=e.employer_profile, status=Job.Status.DRAFT, published_at=None)
    make_job(employer=e.employer_profile, status=Job.Status.SUSPENDED)
    resp = api.get(LIST_URL)
    row = next(r for r in resp.data["results"] if r["company_name"] == "Counter Co")
    assert row["active_job_count"] == 2


@pytest.mark.django_db
def test_company_search_by_name(make_employer, api):
    make_employer(email="a@example.com", company_name="Alpha Analytics")
    make_employer(email="b@example.com", company_name="Beta Builders")
    resp = api.get(LIST_URL, {"name": "alpha"})
    names = {row["company_name"] for row in resp.data["results"]}
    assert names == {"Alpha Analytics"}


@pytest.mark.django_db
def test_company_detail_approved(make_employer, make_job, api):
    e = make_employer(company_name="Detail Co")
    e.employer_profile.culture_text = "Great culture"
    e.employer_profile.save(update_fields=["culture_text"])
    make_job(employer=e.employer_profile, title="Open role", status=Job.Status.PUBLISHED)
    make_job(employer=e.employer_profile, status=Job.Status.DRAFT, published_at=None)
    resp = api.get(detail_url(e.employer_profile.slug))
    assert resp.status_code == 200
    assert resp.data["company_name"] == "Detail Co"
    assert resp.data["is_approved"] is True
    assert resp.data["culture_text"] == "Great culture"
    job_titles = {j["title"] for j in resp.data["active_jobs"]}
    assert job_titles == {"Open role"}


@pytest.mark.django_db
def test_company_detail_404_for_unapproved(make_employer, api):
    e = make_employer(
        company_name="Hidden Co",
        approval_status=EmployerProfile.ApprovalStatus.SUSPENDED,
    )
    assert api.get(detail_url(e.employer_profile.slug)).status_code == 404


@pytest.mark.django_db
def test_company_list_anonymous_allowed(make_employer, api):
    make_employer()
    assert api.get(LIST_URL).status_code == 200
