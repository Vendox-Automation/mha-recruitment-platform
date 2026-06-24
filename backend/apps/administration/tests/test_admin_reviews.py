"""Admin review-moderation API: read queue + audited deletion + authorisation.

Two guarantees:

1. Authorisation is authoritative — every endpoint admits only administrators;
   candidates, employers, and anonymous callers are rejected.
2. Deletions go through the audited service path, so each delete leaves an
   ``AuditLog`` row (reactive moderation is recorded).
"""

from __future__ import annotations

import pytest
from rest_framework import status

from apps.audit.models import AuditLog
from apps.reviews.models import CompanyReview, EmployerReply

pytestmark = pytest.mark.django_db

LIST = "/api/v1/admin/reviews/"


def delete_review_url(review_id: int) -> str:
    return f"/api/v1/admin/reviews/{review_id}/"


def delete_reply_url(review_id: int) -> str:
    return f"/api/v1/admin/reviews/{review_id}/reply/"


def _make_review(make_employer, **kwargs) -> CompanyReview:
    emp = kwargs.pop("employer", None) or make_employer()
    defaults = {
        "reviewer_name": "Reviewer",
        "reviewer_email": "reviewer@example.com",
        "rating": 4,
        "title": "Title",
        "body": "Body",
    }
    defaults.update(kwargs)
    return CompanyReview.objects.create(employer=emp, **defaults)


# --- Authorisation ---------------------------------------------------------


def test_anonymous_denied(api, make_employer):
    review = _make_review(make_employer)
    for method, url in [
        ("get", LIST),
        ("delete", delete_review_url(review.id)),
        ("delete", delete_reply_url(review.id)),
    ]:
        resp = getattr(api, method)(url)
        assert resp.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ), (method, url)


@pytest.mark.parametrize("role", ["candidate", "employer"])
def test_non_admin_denied(api, make_employer, make_candidate, role):
    review = _make_review(make_employer)
    user = make_candidate() if role == "candidate" else make_employer().user
    api.force_authenticate(user=user)
    assert api.get(LIST).status_code == status.HTTP_403_FORBIDDEN
    assert api.delete(delete_review_url(review.id)).status_code == status.HTTP_403_FORBIDDEN


# --- List ------------------------------------------------------------------


def test_admin_list_exposes_email_and_has_reply(api, make_admin, make_employer):
    emp = make_employer(company_name="Reviewed Co")
    r1 = _make_review(make_employer, employer=emp, reviewer_email="seen@example.com")
    EmployerReply.objects.create(review=r1, author=emp.user, body="reply")
    _make_review(make_employer, employer=emp, reviewer_email="other@example.com")

    api.force_authenticate(user=make_admin())
    resp = api.get(LIST)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["count"] == 2
    row = next(r for r in resp.data["results"] if r["id"] == r1.id)
    # Admins MAY see the email.
    assert row["reviewer_email"] == "seen@example.com"
    assert row["company_name"] == "Reviewed Co"
    assert row["has_reply"] is True


def test_admin_list_filter_by_company(api, make_admin, make_employer):
    a = make_employer(company_name="A Co")
    b = make_employer(company_name="B Co")
    _make_review(make_employer, employer=a)
    _make_review(make_employer, employer=b)

    api.force_authenticate(user=make_admin())
    resp = api.get(LIST, {"company": a.slug})
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["company_name"] == "A Co"


def test_admin_list_filter_by_rating(api, make_admin, make_employer):
    _make_review(make_employer, rating=5)
    _make_review(make_employer, rating=3)
    _make_review(make_employer, rating=3)

    api.force_authenticate(user=make_admin())
    resp = api.get(LIST, {"rating": 3})
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["count"] == 2
    assert all(r["rating"] == 3 for r in resp.data["results"])


@pytest.mark.parametrize("value", ["", "0", "6", "abc"])
def test_admin_list_invalid_rating_returns_all(api, make_admin, make_employer, value):
    _make_review(make_employer, rating=5)
    _make_review(make_employer, rating=2)

    api.force_authenticate(user=make_admin())
    resp = api.get(LIST, {"rating": value})
    assert resp.status_code == status.HTTP_200_OK
    # An out-of-range / non-numeric rating is ignored — every review is listed.
    assert resp.data["count"] == 2


def test_admin_list_search(api, make_admin, make_employer):
    _make_review(make_employer, reviewer_name="Alice Distinctive")
    _make_review(make_employer, reviewer_name="Bob Ordinary")

    api.force_authenticate(user=make_admin())
    resp = api.get(LIST, {"search": "Distinctive"})
    assert resp.data["count"] == 1
    assert resp.data["results"][0]["reviewer_name"] == "Alice Distinctive"


# --- Delete review ---------------------------------------------------------


def test_admin_delete_review_audited_and_cascades(api, make_admin, make_employer):
    emp = make_employer()
    review = _make_review(make_employer, employer=emp)
    EmployerReply.objects.create(review=review, author=emp.user, body="reply")
    review_id = review.id

    api.force_authenticate(user=make_admin())
    before = AuditLog.objects.filter(action="review.deleted").count()
    resp = api.delete(delete_review_url(review_id))

    assert resp.status_code == status.HTTP_204_NO_CONTENT
    assert not CompanyReview.objects.filter(id=review_id).exists()
    assert not EmployerReply.objects.filter(review_id=review_id).exists()
    assert AuditLog.objects.filter(action="review.deleted").count() == before + 1


def test_admin_delete_unknown_review_is_404(api, make_admin):
    api.force_authenticate(user=make_admin())
    assert api.delete(delete_review_url(999999)).status_code == status.HTTP_404_NOT_FOUND


# --- Delete reply ----------------------------------------------------------


def test_admin_delete_reply_audited(api, make_admin, make_employer):
    emp = make_employer()
    review = _make_review(make_employer, employer=emp)
    EmployerReply.objects.create(review=review, author=emp.user, body="reply")

    api.force_authenticate(user=make_admin())
    before = AuditLog.objects.filter(action="review.reply_deleted").count()
    resp = api.delete(delete_reply_url(review.id))

    assert resp.status_code == status.HTTP_204_NO_CONTENT
    assert not EmployerReply.objects.filter(review=review).exists()
    # The review survives.
    assert CompanyReview.objects.filter(id=review.id).exists()
    assert AuditLog.objects.filter(action="review.reply_deleted").count() == before + 1


def test_admin_delete_reply_when_none_is_404(api, make_admin, make_employer):
    review = _make_review(make_employer)
    api.force_authenticate(user=make_admin())
    assert api.delete(delete_reply_url(review.id)).status_code == status.HTTP_404_NOT_FOUND
