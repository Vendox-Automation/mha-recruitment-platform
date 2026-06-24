"""Employer reply API: own-company create/update/delete + isolation boundary.

The dominant guarantee is employer isolation: an approved employer may reply to
a review of their OWN company only; a review of another company yields 404
(never confirming its existence), and non-employers are rejected by the
permission class.
"""

from __future__ import annotations

import pytest
from rest_framework import status

from apps.employers.models import EmployerProfile
from apps.reviews.models import EmployerReply

AS = EmployerProfile.ApprovalStatus

pytestmark = pytest.mark.django_db


def reply_url(review_id: int) -> str:
    return f"/api/v1/employer/reviews/{review_id}/reply/"


def test_owning_employer_can_create_reply(api, make_employer, make_review):
    emp = make_employer()
    review = make_review(emp)
    api.force_authenticate(user=emp.user)

    resp = api.post(reply_url(review.id), {"body": "Thanks for visiting"}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["body"] == "Thanks for visiting"
    reply = EmployerReply.objects.get(review=review)
    assert reply.author_id == emp.user.id


def test_reply_is_upserted_not_duplicated(api, make_employer, make_review):
    emp = make_employer()
    review = make_review(emp)
    api.force_authenticate(user=emp.user)

    api.post(reply_url(review.id), {"body": "First"}, format="json")
    resp = api.post(reply_url(review.id), {"body": "Updated"}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["body"] == "Updated"
    assert EmployerReply.objects.filter(review=review).count() == 1


def test_owning_employer_can_delete_reply(api, make_employer, make_review):
    emp = make_employer()
    review = make_review(emp)
    EmployerReply.objects.create(review=review, author=emp.user, body="To delete")
    api.force_authenticate(user=emp.user)

    resp = api.delete(reply_url(review.id))
    assert resp.status_code == status.HTTP_204_NO_CONTENT
    assert not EmployerReply.objects.filter(review=review).exists()


def test_delete_when_no_reply_is_404(api, make_employer, make_review):
    emp = make_employer()
    review = make_review(emp)
    api.force_authenticate(user=emp.user)
    assert api.delete(reply_url(review.id)).status_code == status.HTTP_404_NOT_FOUND


def test_different_employer_gets_404_on_post(api, make_employer, make_review):
    owner = make_employer(company_name="Owner Co")
    other = make_employer(company_name="Other Co")
    review = make_review(owner)
    api.force_authenticate(user=other.user)

    resp = api.post(reply_url(review.id), {"body": "Sneaky"}, format="json")
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert not EmployerReply.objects.filter(review=review).exists()


def test_different_employer_gets_404_on_delete(api, make_employer, make_review):
    owner = make_employer(company_name="Owner Co")
    other = make_employer(company_name="Other Co")
    review = make_review(owner)
    EmployerReply.objects.create(review=review, author=owner.user, body="Owner reply")
    api.force_authenticate(user=other.user)

    resp = api.delete(reply_url(review.id))
    assert resp.status_code == status.HTTP_404_NOT_FOUND
    assert EmployerReply.objects.filter(review=review).exists()


def test_unknown_review_id_is_404(api, make_employer):
    emp = make_employer()
    api.force_authenticate(user=emp.user)
    assert api.post(reply_url(999999), {"body": "x"}, format="json").status_code == (
        status.HTTP_404_NOT_FOUND
    )


def test_pending_employer_is_403(api, make_employer, make_review):
    emp = make_employer(company_name="Approved Co")
    review = make_review(emp)
    pending = make_employer(company_name="Pending Co", approval_status=AS.PENDING)
    api.force_authenticate(user=pending.user)
    resp = api.post(reply_url(review.id), {"body": "x"}, format="json")
    assert resp.status_code == status.HTTP_403_FORBIDDEN
    assert resp.data["code"] == "permission_denied"


def test_candidate_is_403(api, make_employer, make_candidate, make_review):
    emp = make_employer()
    review = make_review(emp)
    api.force_authenticate(user=make_candidate())
    resp = api.post(reply_url(review.id), {"body": "x"}, format="json")
    assert resp.status_code == status.HTTP_403_FORBIDDEN


def test_anonymous_is_denied(api, make_employer, make_review):
    emp = make_employer()
    review = make_review(emp)
    resp = api.post(reply_url(review.id), {"body": "x"}, format="json")
    assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)


def test_reply_body_required(api, make_employer, make_review):
    emp = make_employer()
    review = make_review(emp)
    api.force_authenticate(user=emp.user)
    resp = api.post(reply_url(review.id), {}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "body" in resp.data["fields"]
