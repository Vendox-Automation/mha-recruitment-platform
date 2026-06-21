"""Employer approval workflow (spec §8.3-8.6, §14.8, §14.13; AGENTS §10, §13).

Django is the authoritative owner of the employer lifecycle. Each transition is
a single service function that runs in ``transaction.atomic`` and performs the
whole state change as one unit:

1. update ``EmployerProfile.approval_status`` + the relevant timestamps,
   ``approved_by`` and ``approval_reason``;
2. sync the related ``User.status`` (which keeps ``is_active`` correct via
   ``User.save``);
3. write exactly one ``AuditLog`` entry via the audit service;
4. trigger the transactional email (approve / reject).

Because the email send is inside the transaction, a delivery failure rolls the
state change back — we never persist a transition whose notification was lost.

State-transition matrix (employer.approval_status / user.status):

    action    from approval        -> to approval   ; user.status -> ; email   ; audit action
    approve   PENDING|REJECTED      -> APPROVED      ; -> ACTIVE      ; approved; employer.approved
    reject    PENDING              -> REJECTED      ; -> PENDING     ; rejected; employer.rejected
    suspend   APPROVED             -> SUSPENDED     ; -> SUSPENDED   ; (none)  ; employer.suspended
    restore   SUSPENDED|REJECTED   -> APPROVED      ; -> ACTIVE      ; (none)  ; employer.restored

A rejected employer keeps ``user.status = PENDING`` (not DEACTIVATED) so they can
still sign in, read the rejection reason, fix their details and resubmit. A
suspended employer keeps ``is_active = True`` (status SUSPENDED) so they can sign
in to a restricted screen. Illegal transitions raise ``IllegalTransition``.
"""

from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.services import record_action
from apps.employers.models import EmployerProfile
from apps.employers.services.email_service import (
    send_employer_approved,
    send_employer_rejected,
)

AS = EmployerProfile.ApprovalStatus


class IllegalTransition(Exception):
    """Raised when an approval action is not valid from the current status."""


def _require(profile: EmployerProfile, allowed: set[str], action: str) -> None:
    if profile.approval_status not in allowed:
        raise IllegalTransition(f"Cannot {action} an employer in status {profile.approval_status}.")


@transaction.atomic
def approve_employer(profile: EmployerProfile, *, actor: User | None) -> EmployerProfile:
    """Approve a PENDING or REJECTED employer.

    Sets approval APPROVED, records approver + timestamp, clears the prior
    rejection reason, activates the user, audits, and emails the employer.
    """
    _require(profile, {AS.PENDING, AS.REJECTED}, "approve")

    profile.approval_status = AS.APPROVED
    profile.approved_by = actor
    profile.approved_at = timezone.now()
    profile.approval_reason = ""
    profile.save(
        update_fields=[
            "approval_status",
            "approved_by",
            "approved_at",
            "approval_reason",
            "updated_at",
        ]
    )

    user = profile.user
    if user.status != User.Status.ACTIVE:
        user.status = User.Status.ACTIVE
        user.save(update_fields=["status", "is_active", "updated_at"])

    record_action(
        actor=actor,
        action="employer.approved",
        target=profile,
        metadata={"company_name": profile.company_name, "user_id": str(user.pk)},
    )
    send_employer_approved(user)
    return profile


@transaction.atomic
def reject_employer(
    profile: EmployerProfile, *, actor: User | None, reason: str
) -> EmployerProfile:
    """Reject a PENDING employer with a (required, non-sensitive) reason.

    The user stays PENDING (signable) so they can read the reason and resubmit.
    """
    reason = (reason or "").strip()
    if not reason:
        raise IllegalTransition("A rejection reason is required.")
    _require(profile, {AS.PENDING}, "reject")

    profile.approval_status = AS.REJECTED
    profile.approval_reason = reason
    profile.approved_by = actor
    profile.approved_at = None
    profile.save(
        update_fields=[
            "approval_status",
            "approval_reason",
            "approved_by",
            "approved_at",
            "updated_at",
        ]
    )

    user = profile.user
    if user.status != User.Status.PENDING:
        user.status = User.Status.PENDING
        user.save(update_fields=["status", "is_active", "updated_at"])

    record_action(
        actor=actor,
        action="employer.rejected",
        target=profile,
        metadata={"company_name": profile.company_name, "user_id": str(user.pk), "reason": reason},
    )
    send_employer_rejected(user, reason)
    return profile


@transaction.atomic
def suspend_employer(
    profile: EmployerProfile, *, actor: User | None, reason: str = ""
) -> EmployerProfile:
    """Suspend an APPROVED employer.

    The user stays is_active (status SUSPENDED) so they can sign in to a
    restricted screen, but ``IsApprovedEmployer`` actions are denied. No email is
    sent in the MVP; the action is audited.
    """
    _require(profile, {AS.APPROVED}, "suspend")
    reason = (reason or "").strip()

    profile.approval_status = AS.SUSPENDED
    profile.suspended_at = timezone.now()
    if reason:
        profile.approval_reason = reason
    profile.save(update_fields=["approval_status", "suspended_at", "approval_reason", "updated_at"])

    user = profile.user
    if user.status != User.Status.SUSPENDED:
        user.status = User.Status.SUSPENDED
        user.save(update_fields=["status", "is_active", "updated_at"])

    record_action(
        actor=actor,
        action="employer.suspended",
        target=profile,
        metadata={"company_name": profile.company_name, "user_id": str(user.pk), "reason": reason},
    )
    return profile


@transaction.atomic
def restore_employer(profile: EmployerProfile, *, actor: User | None) -> EmployerProfile:
    """Restore a SUSPENDED (or REJECTED) employer back to APPROVED + ACTIVE.

    Clears the suspension timestamp and reactivates the user. Audited; no email
    in the MVP.
    """
    _require(profile, {AS.SUSPENDED, AS.REJECTED}, "restore")

    profile.approval_status = AS.APPROVED
    profile.approved_by = actor
    profile.approved_at = timezone.now()
    profile.suspended_at = None
    profile.approval_reason = ""
    profile.save(
        update_fields=[
            "approval_status",
            "approved_by",
            "approved_at",
            "suspended_at",
            "approval_reason",
            "updated_at",
        ]
    )

    user = profile.user
    if user.status != User.Status.ACTIVE:
        user.status = User.Status.ACTIVE
        user.save(update_fields=["status", "is_active", "updated_at"])

    record_action(
        actor=actor,
        action="employer.restored",
        target=profile,
        metadata={"company_name": profile.company_name, "user_id": str(user.pk)},
    )
    return profile
