"""Company-review workflow (product scope addition).

All review/reply state changes go through here so views stay thin and the rules
(audit on deletion, one-reply-per-review upsert, aggregate computation) live in
one place.

* :func:`create_review` — publish a public review immediately (no approval).
* :func:`set_reply` — create or update the single employer reply (upsert).
* :func:`delete_review` / :func:`delete_reply` — audited reactive moderation.
* :func:`aggregate_for` — average / count / rating distribution for a company,
  computed in a single annotated query.

Deletions are audit-sensitive (reactive moderation), so they record exactly one
``AuditLog`` entry inside the same transaction as the delete: a rollback drops
both, keeping the trail honest (mirrors the support/approval services).
"""

from __future__ import annotations

from typing import Any

from django.db import transaction
from django.db.models import Avg, Count, Q

from apps.audit.services import record_action
from apps.employers.models import EmployerProfile
from apps.reviews.models import CompanyReview, EmployerReply


def create_review(
    employer: EmployerProfile,
    *,
    reviewer_name: str,
    reviewer_email: str,
    rating: int,
    title: str = "",
    body: str = "",
) -> CompanyReview:
    """Create and immediately publish a public review for ``employer``."""
    return CompanyReview.objects.create(
        employer=employer,
        reviewer_name=reviewer_name,
        reviewer_email=reviewer_email,
        rating=rating,
        title=title or "",
        body=body or "",
    )


@transaction.atomic
def set_reply(review: CompanyReview, *, author, body: str) -> EmployerReply:
    """Create or update the single employer reply for ``review`` (upsert)."""
    reply, _created = EmployerReply.objects.update_or_create(
        review=review,
        defaults={"author": author, "body": body},
    )
    return reply


@transaction.atomic
def delete_review(review: CompanyReview, *, actor) -> None:
    """Delete a review (cascades its reply) and record one audit entry.

    The audit metadata captures the company, the review id, and the reviewer
    name so the action is reconstructable after the row is gone. The audit row
    is written before the delete (same transaction) so ``record_action`` can
    still derive the target from the live instance.
    """
    record_action(
        actor=actor,
        action="review.deleted",
        target=review,
        metadata={
            "employer": review.employer_id,
            "review_id": review.id,
            "reviewer_name": review.reviewer_name,
        },
    )
    review.delete()


@transaction.atomic
def delete_reply(reply: EmployerReply, *, actor) -> None:
    """Delete just the employer reply and record one audit entry."""
    record_action(
        actor=actor,
        action="review.reply_deleted",
        target=reply,
        metadata={
            "employer": reply.review.employer_id,
            "review_id": reply.review_id,
            "reply_id": reply.id,
        },
    )
    reply.delete()


def aggregate_for(employer: EmployerProfile) -> dict[str, Any]:
    """Return rating aggregates for one company in a single annotated query.

    Shape::

        {
          "average_rating": float | None,   # 1 dp, None when there are 0 reviews
          "review_count": int,
          "rating_distribution": {"1": n, ..., "5": n},
        }
    """
    row = CompanyReview.objects.filter(employer=employer).aggregate(
        average_rating=Avg("rating"),
        review_count=Count("id"),
        r1=Count("id", filter=Q(rating=1)),
        r2=Count("id", filter=Q(rating=2)),
        r3=Count("id", filter=Q(rating=3)),
        r4=Count("id", filter=Q(rating=4)),
        r5=Count("id", filter=Q(rating=5)),
    )
    avg = row["average_rating"]
    return {
        "average_rating": round(avg, 1) if avg is not None else None,
        "review_count": row["review_count"],
        "rating_distribution": {
            "1": row["r1"],
            "2": row["r2"],
            "3": row["r3"],
            "4": row["r4"],
            "5": row["r5"],
        },
    }
