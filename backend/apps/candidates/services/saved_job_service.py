"""Saved-job workflow (spec §15.5, §20.9).

A candidate bookmarks a public job for later. The single create/delete path lives
here so the view stays thin and the duplicate-save contract is enforced in one
place. Saving is not an audit-sensitive action (no personal data is exposed and
nothing changes another party's state), so — unlike resume access or admin
moderation — no ``AuditLog`` row is written here (audit is reserved for sensitive
actions, ADR-0001 §3.1).

Resolution accepts either a job ``slug`` or a job ``id`` and is gated by
:meth:`Job.objects.public`, so a candidate can only save a job that is currently
visible to them — drafts/suspended/expired jobs cannot be bookmarked. (An
already-saved job that later leaves ``public()`` stays in the list, flagged
unavailable by the selector — spec §15.5: label, do not hide.)
"""

from __future__ import annotations

import uuid

from rest_framework.exceptions import ValidationError

from apps.candidates.models import CandidateProfile, SavedJob
from apps.jobs.models import Job


def _resolve_public_job(*, job_ref: str) -> Job:
    """Resolve a public job by slug or UUID id, or raise ``ValidationError``.

    Only ``Job.objects.public()`` is searched, so a non-public job is reported as
    "not found / not available" without leaking whether a private job exists.
    """
    ref = (str(job_ref) if job_ref is not None else "").strip()
    if not ref:
        raise ValidationError({"job": ["This field is required."]})

    qs = Job.objects.public()

    # Try a UUID id first (only when the value parses as one), then fall back to
    # the non-enumerable slug. This avoids a DB error on a non-UUID slug value.
    job = None
    try:
        job_uuid = uuid.UUID(ref)
    except (ValueError, AttributeError, TypeError):
        job_uuid = None
    if job_uuid is not None:
        job = qs.filter(pk=job_uuid).first()
    if job is None:
        job = qs.filter(slug=ref).first()

    if job is None:
        raise ValidationError(
            {"job": ["This job is not available to save."]},
        )
    return job


def save_job(*, profile: CandidateProfile, job_ref: str) -> tuple[SavedJob, bool]:
    """Bookmark a public job for ``profile``.

    Returns ``(saved_job, created)``. A repeat save is idempotent: the existing
    row is returned with ``created=False`` (the view turns that into a 200 no-op),
    so the unique constraint never surfaces as a 500.
    """
    job = _resolve_public_job(job_ref=job_ref)
    saved, created = SavedJob.objects.get_or_create(candidate=profile, job=job)
    return saved, created


def unsave_job(*, profile: CandidateProfile, job_id: str) -> bool:
    """Remove a bookmark by JOB id. Returns ``True`` if a row was deleted.

    Scoped to ``profile`` so one candidate can never delete another's bookmark;
    a non-existent / non-owned bookmark simply deletes nothing (the view 404s).
    """
    try:
        job_uuid = uuid.UUID(str(job_id))
    except (ValueError, AttributeError, TypeError):
        return False
    deleted, _ = SavedJob.objects.filter(candidate=profile, job_id=job_uuid).delete()
    return bool(deleted)
