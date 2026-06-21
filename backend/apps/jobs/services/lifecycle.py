"""Job lifecycle transitions (spec §14.11, §21.4).

Django owns the job state machine. Each transition is a single function run in
``transaction.atomic`` so the status change and its timestamps are one unit.
Employer-driven transitions (publish/close/reopen) live here; admin moderation
(suspend/close/remove/mark-supported) lives in :mod:`apps.jobs.services.moderation`
because it additionally writes an audit entry.

Allowed employer transitions:

    publish   DRAFT | CLOSED        -> PUBLISHED   (sets published_at)
    close     PUBLISHED             -> CLOSED      (sets closed_at)
    reopen    CLOSED                -> PUBLISHED   (sets published_at)

An approved employer publishes immediately (no admin gate). A SUSPENDED job is
admin-controlled and cannot be transitioned by the employer.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.jobs.models import Job

S = Job.Status


class IllegalJobTransition(Exception):
    """Raised when a lifecycle action is invalid from the current status."""


def _require(job: Job, allowed: set[str], action: str) -> None:
    if job.status not in allowed:
        raise IllegalJobTransition(f"Cannot {action} a job in status {job.status}.")


@transaction.atomic
def publish_job(job: Job) -> Job:
    """Publish a DRAFT or CLOSED job (approved employers publish immediately).

    Refuses to publish a job whose application deadline is already in the past —
    that would create a listing that is immediately invisible to candidates.
    """
    _require(job, {S.DRAFT, S.CLOSED}, "publish")
    if job.application_deadline is not None and job.application_deadline < timezone.localdate():
        raise IllegalJobTransition(
            "The application deadline has already passed; update it before publishing."
        )
    job.status = S.PUBLISHED
    job.published_at = timezone.now()
    job.closed_at = None
    job.save(update_fields=["status", "published_at", "closed_at", "updated_at"])
    return job


@transaction.atomic
def close_job(job: Job) -> Job:
    """Close a PUBLISHED job."""
    _require(job, {S.PUBLISHED}, "close")
    job.status = S.CLOSED
    job.closed_at = timezone.now()
    job.save(update_fields=["status", "closed_at", "updated_at"])
    return job


@transaction.atomic
def reopen_job(job: Job) -> Job:
    """Reopen a CLOSED job back to PUBLISHED."""
    _require(job, {S.CLOSED}, "reopen")
    job.status = S.PUBLISHED
    job.published_at = timezone.now()
    job.closed_at = None
    job.save(update_fields=["status", "published_at", "closed_at", "updated_at"])
    return job
