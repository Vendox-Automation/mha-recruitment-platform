"""Employer-driven application state changes (spec §14.12, §20.8, §22.1).

Two authoritative mutations live here so the views/serializers stay thin and the
multi-record state change (Application.status + ApplicationStatusHistory + audit)
is always atomic:

  * :func:`change_status` — move an application to any of the seven statuses,
    writing exactly one immutable history row (from=old, to=new, changed_by) and
    one audit entry, inside a single transaction.
  * :func:`update_private_notes` — set ``employer_private_notes`` (employer-only
    data that is never serialised to candidates) and audit the change.

Both take an already-scoped ``Application`` (resolved via the employer-isolation
queryset in :mod:`apps.applications.permissions`) plus the acting ``user``. They
do NOT re-authorise ownership — that is the caller's queryset responsibility —
but they record *who* acted for the audit trail.
"""

from __future__ import annotations

from django.db import transaction
from rest_framework import serializers

from apps.audit.services import record_action

from ..models import Application, ApplicationStatus, ApplicationStatusHistory


@transaction.atomic
def change_status(
    *,
    application: Application,
    new_status: str,
    actor,
    change_note: str = "",
) -> Application:
    """Transition ``application`` to ``new_status`` and record history + audit.

    Employers may move an application forward or back, and to REJECTED — any of
    the seven valid statuses is permitted (the frontend confirms destructive
    moves). The only rejection here is an *invalid* status value.

    Exactly one :class:`ApplicationStatusHistory` row is written per call, even
    when the status is unchanged, so the trail records every reviewer action.
    The history row, the status update, and the audit entry share one
    transaction: a rollback drops all three together.
    """
    if new_status not in ApplicationStatus.values:
        raise serializers.ValidationError({"status": ["Not a valid status."]})

    old_status = application.status

    ApplicationStatusHistory.objects.create(
        application=application,
        from_status=old_status,
        to_status=new_status,
        changed_by=actor,
        change_note=change_note or "",
    )

    application.status = new_status
    application.save(update_fields=["status", "updated_at"])

    record_action(
        actor=actor,
        action="application.status_changed",
        target=application,
        metadata={
            "from_status": old_status,
            "to_status": new_status,
            "job_id": str(application.job_id),
        },
    )
    return application


@transaction.atomic
def update_private_notes(*, application: Application, notes: str, actor) -> Application:
    """Replace the employer-only private notes on ``application``.

    These notes are authoritative employer data and are NEVER serialised to the
    candidate (enforced by the candidate serializers' explicit field lists). The
    change is audited because the notes are sensitive personal-data context.
    """
    application.employer_private_notes = notes or ""
    application.save(update_fields=["employer_private_notes", "updated_at"])

    record_action(
        actor=actor,
        action="application.notes_updated",
        target=application,
        metadata={"job_id": str(application.job_id)},
    )
    return application
