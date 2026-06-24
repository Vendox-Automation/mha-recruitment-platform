"""Public company-review API: list + create (publish-immediately) + boundaries.

Covers the visibility boundary (only APPROVED companies are listable/reviewable),
the publish-immediately contract, that the reviewer's email is never echoed, and
the create-path validation (name/email/rating).
"""

from __future__ import annotations

import pytest
from rest_framework import status

from apps.employers.models import EmployerProfile
from apps.reviews.models import CompanyReview

AS = EmployerProfile.ApprovalStatus

pytestmark = pytest.mark.django_db


def reviews_url(slug: str) -> str:
    return f"/api/v1/companies/{slug}/reviews/"


# --- List ------------------------------------------------------------------


def test_list_for_approved_company(api, make_employer, make_review):
    emp = make_employer(company_name="Listed Co")
    make_review(emp, rating=5, title="Great")
    make_review(emp, rating=4, title="Good")

    resp = api.get(reviews_url(emp.slug))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["count"] == 2
    row = resp.data["results"][0]
    assert set(row.keys()) == {
        "id",
        "reviewer_name",
        "rating",
        "title",
        "body",
        "created_at",
        "reply",
    }
    assert "reviewer_email" not in row


def test_list_includes_reply_when_present(api, make_employer, make_review):
    from apps.reviews.models import EmployerReply

    emp = make_employer()
    review = make_review(emp)
    EmployerReply.objects.create(review=review, author=emp.user, body="Thanks for the feedback")

    resp = api.get(reviews_url(emp.slug))
    row = resp.data["results"][0]
    assert row["reply"]["body"] == "Thanks for the feedback"
    assert "created_at" in row["reply"]


def test_list_404_for_unapproved_company(api, make_employer):
    emp = make_employer(approval_status=AS.PENDING)
    assert api.get(reviews_url(emp.slug)).status_code == status.HTTP_404_NOT_FOUND


def test_list_404_for_unknown_slug(api):
    assert api.get(reviews_url("does-not-exist")).status_code == status.HTTP_404_NOT_FOUND


# --- Create (publishes immediately) ----------------------------------------


def test_create_valid_publishes_immediately(api, make_employer):
    emp = make_employer()
    payload = {
        "reviewer_name": "Jordan Public",
        "reviewer_email": "jordan@example.com",
        "rating": 5,
        "title": "Loved it",
        "body": "Genuinely great experience.",
    }
    resp = api.post(reviews_url(emp.slug), payload, format="json")
    assert resp.status_code == status.HTTP_201_CREATED
    # Published immediately: the row exists right away.
    review = CompanyReview.objects.get()
    assert review.employer_id == emp.id
    assert review.rating == 5
    # Email is stored but NEVER echoed in the response.
    assert review.reviewer_email == "jordan@example.com"
    assert "reviewer_email" not in resp.data
    assert resp.data["reviewer_name"] == "Jordan Public"
    assert resp.data["reply"] is None


def test_create_title_and_body_optional(api, make_employer):
    emp = make_employer()
    resp = api.post(
        reviews_url(emp.slug),
        {"reviewer_name": "No Body", "reviewer_email": "nb@example.com", "rating": 4},
        format="json",
    )
    assert resp.status_code == status.HTTP_201_CREATED
    review = CompanyReview.objects.get()
    assert review.title == ""
    assert review.body == ""


def test_create_missing_name_is_400(api, make_employer):
    emp = make_employer()
    resp = api.post(
        reviews_url(emp.slug),
        {"reviewer_email": "x@example.com", "rating": 4},
        format="json",
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["code"] == "validation_error"
    assert "reviewer_name" in resp.data["fields"]


def test_create_missing_email_is_400(api, make_employer):
    emp = make_employer()
    resp = api.post(
        reviews_url(emp.slug),
        {"reviewer_name": "X", "rating": 4},
        format="json",
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "reviewer_email" in resp.data["fields"]


def test_create_invalid_email_is_400(api, make_employer):
    emp = make_employer()
    resp = api.post(
        reviews_url(emp.slug),
        {"reviewer_name": "X", "reviewer_email": "not-an-email", "rating": 4},
        format="json",
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "reviewer_email" in resp.data["fields"]


@pytest.mark.parametrize("rating", [0, 6, -1, 99])
def test_create_rating_out_of_range_is_400(api, make_employer, rating):
    emp = make_employer()
    resp = api.post(
        reviews_url(emp.slug),
        {"reviewer_name": "X", "reviewer_email": "x@example.com", "rating": rating},
        format="json",
    )
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "rating" in resp.data["fields"]


def test_create_for_unapproved_company_is_404(api, make_employer):
    emp = make_employer(approval_status=AS.SUSPENDED)
    resp = api.post(
        reviews_url(emp.slug),
        {"reviewer_name": "X", "reviewer_email": "x@example.com", "rating": 5},
        format="json",
    )
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert CompanyReview.objects.count() == 0
