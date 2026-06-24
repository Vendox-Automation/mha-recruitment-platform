"""Review service tests: aggregate_for + audited deletions."""

from __future__ import annotations

import pytest

from apps.audit.models import AuditLog
from apps.reviews.models import EmployerReply
from apps.reviews.services import aggregate_for, delete_reply, delete_review

pytestmark = pytest.mark.django_db


def test_aggregate_empty_company(make_employer):
    emp = make_employer()
    agg = aggregate_for(emp)
    assert agg["average_rating"] is None
    assert agg["review_count"] == 0
    assert agg["rating_distribution"] == {"1": 0, "2": 0, "3": 0, "4": 0, "5": 0}


def test_aggregate_counts_and_average(make_employer, make_review):
    emp = make_employer()
    make_review(emp, rating=5)
    make_review(emp, rating=4)
    make_review(emp, rating=3)
    make_review(emp, rating=5)

    agg = aggregate_for(emp)
    assert agg["review_count"] == 4
    # (5 + 4 + 3 + 5) / 4 = 4.25 -> 4.2 (banker's rounding to 1 dp)
    assert agg["average_rating"] == round(17 / 4, 1)
    assert agg["rating_distribution"] == {"1": 0, "2": 0, "3": 1, "4": 1, "5": 2}


def test_aggregate_is_scoped_to_one_company(make_employer, make_review):
    a = make_employer(company_name="A Co")
    b = make_employer(company_name="B Co")
    make_review(a, rating=5)
    make_review(b, rating=1)
    make_review(b, rating=1)

    assert aggregate_for(a)["review_count"] == 1
    assert aggregate_for(a)["average_rating"] == 5.0
    assert aggregate_for(b)["review_count"] == 2
    assert aggregate_for(b)["average_rating"] == 1.0


def test_delete_review_audited_and_cascades_reply(make_employer, make_review, make_admin):
    emp = make_employer()
    review = make_review(emp, reviewer_name="To Remove")
    EmployerReply.objects.create(review=review, author=emp.user, body="reply")
    admin = make_admin()
    review_id = review.id

    before = AuditLog.objects.filter(action="review.deleted").count()
    delete_review(review, actor=admin)

    assert AuditLog.objects.filter(action="review.deleted").count() == before + 1
    entry = AuditLog.objects.filter(action="review.deleted").latest("created_at")
    assert entry.actor_id == admin.id
    assert entry.metadata_json["review_id"] == review_id
    assert entry.metadata_json["reviewer_name"] == "To Remove"
    # The reply is cascaded with the review.
    assert not EmployerReply.objects.filter(review_id=review_id).exists()


def test_delete_reply_audited(make_employer, make_review, make_admin):
    emp = make_employer()
    review = make_review(emp)
    reply = EmployerReply.objects.create(review=review, author=emp.user, body="reply")
    admin = make_admin()

    before = AuditLog.objects.filter(action="review.reply_deleted").count()
    delete_reply(reply, actor=admin)

    assert AuditLog.objects.filter(action="review.reply_deleted").count() == before + 1
    # The review itself survives a reply deletion.
    review.refresh_from_db()
    assert not EmployerReply.objects.filter(review=review).exists()
