"""Public company serializers expose the review aggregate fields (scope add).

The directory list reads annotated aggregates (no N+1 across companies) and the
detail computes them via the reviews service. These tests assert the contract:
the fields are present and correct, and a company with no reviews reports
``None`` / 0 rather than erroring.
"""

from __future__ import annotations

import pytest
from django.urls import reverse

from apps.reviews.models import CompanyReview

LIST_URL = reverse("companies:company-list")


def detail_url(slug):
    return reverse("companies:company-detail", args=[slug])


def _add_review(employer, rating, email):
    return CompanyReview.objects.create(
        employer=employer,
        reviewer_name="R",
        reviewer_email=email,
        rating=rating,
        title="",
        body="",
    )


@pytest.mark.django_db
def test_company_list_exposes_rating_aggregate(make_employer, api):
    e = make_employer(company_name="Rated Co")
    profile = e.employer_profile
    _add_review(profile, 5, "a@example.com")
    _add_review(profile, 4, "b@example.com")

    resp = api.get(LIST_URL)
    row = next(r for r in resp.data["results"] if r["company_name"] == "Rated Co")
    assert row["review_count"] == 2
    assert row["average_rating"] == 4.5


@pytest.mark.django_db
def test_company_list_no_reviews_reports_none(make_employer, api):
    make_employer(company_name="Unrated Co")
    resp = api.get(LIST_URL)
    row = next(r for r in resp.data["results"] if r["company_name"] == "Unrated Co")
    assert row["review_count"] == 0
    assert row["average_rating"] is None


@pytest.mark.django_db
def test_company_detail_exposes_distribution(make_employer, api):
    e = make_employer(company_name="Distributed Co")
    profile = e.employer_profile
    _add_review(profile, 5, "a@example.com")
    _add_review(profile, 5, "b@example.com")
    _add_review(profile, 3, "c@example.com")

    resp = api.get(detail_url(profile.slug))
    assert resp.status_code == 200
    assert resp.data["review_count"] == 3
    assert resp.data["average_rating"] == round(13 / 3, 1)
    assert resp.data["rating_distribution"] == {"1": 0, "2": 0, "3": 1, "4": 0, "5": 2}


@pytest.mark.django_db
def test_company_detail_no_reviews(make_employer, api):
    e = make_employer(company_name="Empty Co")
    resp = api.get(detail_url(e.employer_profile.slug))
    assert resp.data["review_count"] == 0
    assert resp.data["average_rating"] is None
    assert resp.data["rating_distribution"] == {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}
