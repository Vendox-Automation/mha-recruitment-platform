"""Admin job moderation (spec §14.11, §22.1; AGENTS §10, §13).

Admin moderation is audit-sensitive: every suspend / close / remove / mark-
supported action writes exactly one ``AuditLog`` entry via the audit service,
inside the same transaction as the state change so a rollback also drops the
audit row (ADR-0001 §3.1). The Django admin routes its actions through these
functions rather than mutating fields directly, so there is no admin path that
moderates a job without an audit trail.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.audit.services import record_action
from apps.jobs.models import Job

S = Job.Status


@transaction.atomic
def suspend_job(job: Job, *, actor, reason: str = "") -> Job:
    """Suspend a job (admin moderation). Removes it from public results."""
    reason = (reason or "").strip()
    job.status = S.SUSPENDED
    if reason:
        job.moderation_reason = reason
    job.save(update_fields=["status", "moderation_reason", "updated_at"])
    record_action(
        actor=actor,
        action="job.suspended",
        target=job,
        metadata={"title": job.title, "reason": reason},
    )
    return job


@transaction.atomic
def admin_close_job(job: Job, *, actor, reason: str = "") -> Job:
    """Close a job by admin action (distinct from employer self-close)."""
    reason = (reason or "").strip()
    job.status = S.CLOSED
    job.closed_at = timezone.now()
    if reason:
        job.moderation_reason = reason
    job.save(update_fields=["status", "closed_at", "moderation_reason", "updated_at"])
    record_action(
        actor=actor,
        action="job.closed_by_admin",
        target=job,
        metadata={"title": job.title, "reason": reason},
    )
    return job


@transaction.atomic
def set_mha_supported(job: Job, *, actor, supported: bool) -> Job:
    """Toggle the MHA-supported flag on a job (admin moderation)."""
    job.is_mha_supported = supported
    job.save(update_fields=["is_mha_supported", "updated_at"])
    record_action(
        actor=actor,
        action="job.mha_supported_set",
        target=job,
        metadata={"title": job.title, "is_mha_supported": supported},
    )
    return job


@transaction.atomic
def remove_job(job: Job, *, actor) -> None:
    """Hard-delete a job (admin moderation). Writes the audit row first.

    The audit entry is written before deletion so ``target_id`` is captured;
    both occur in one transaction, so if the delete fails the audit row is
    rolled back too.
    """
    record_action(
        actor=actor,
        action="job.removed",
        target=job,
        metadata={"title": job.title, "employer_id": str(job.employer_id or "")},
    )
    job.delete()
