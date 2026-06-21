"""Employer approval service transitions (spec §8.3-8.6, §14.8, §22.1).

Behaviour-focused: each transition sets the right approval_status + user.status
+ timestamps + approved_by, writes exactly one AuditLog, and sends the right
email (or none). Illegal transitions are rejected.
"""

from __future__ import annotations

import pytest
from django.core import mail
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.employers.models import EmployerProfile
from apps.employers.services import approval_service
from apps.employers.services.approval_service import IllegalTransition

AS = EmployerProfile.ApprovalStatus


@pytest.fixture(autouse=True)
def _clear_outbox():
    mail.outbox = []


def _audit_count(action: str) -> int:
    return AuditLog.objects.filter(action=action).count()


@pytest.mark.django_db
def test_approve_pending_employer(make_employer, make_admin):
    admin = make_admin()
    user = make_employer(status=User.Status.PENDING, approval_status=AS.PENDING)
    profile = user.employer_profile

    approval_service.approve_employer(profile, actor=admin)

    profile.refresh_from_db()
    user.refresh_from_db()
    assert profile.approval_status == AS.APPROVED
    assert profile.approved_by == admin
    assert profile.approved_at is not None
    assert profile.approval_reason == ""
    assert user.status == User.Status.ACTIVE
    assert user.is_active is True
    assert _audit_count("employer.approved") == 1
    assert len(mail.outbox) == 1
    assert user.email in mail.outbox[0].to


@pytest.mark.django_db
def test_reject_pending_employer_keeps_user_signable(make_employer, make_admin):
    admin = make_admin()
    user = make_employer(status=User.Status.PENDING, approval_status=AS.PENDING)
    profile = user.employer_profile

    approval_service.reject_employer(profile, actor=admin, reason="Incomplete company details.")

    profile.refresh_from_db()
    user.refresh_from_db()
    assert profile.approval_status == AS.REJECTED
    assert profile.approval_reason == "Incomplete company details."
    assert profile.approved_at is None
    # User stays PENDING (not DEACTIVATED) so they can sign in to see the reason.
    assert user.status == User.Status.PENDING
    assert user.is_active is True
    assert _audit_count("employer.rejected") == 1
    assert len(mail.outbox) == 1
    assert "Incomplete company details." in mail.outbox[0].body


@pytest.mark.django_db
def test_reject_requires_reason(make_employer, make_admin):
    admin = make_admin()
    user = make_employer()
    with pytest.raises(IllegalTransition):
        approval_service.reject_employer(user.employer_profile, actor=admin, reason="   ")
    assert _audit_count("employer.rejected") == 0
    assert mail.outbox == []


@pytest.mark.django_db
def test_suspend_approved_employer_stays_signable(make_employer, make_admin):
    admin = make_admin()
    user = make_employer(status=User.Status.ACTIVE, approval_status=AS.APPROVED)
    profile = user.employer_profile

    approval_service.suspend_employer(profile, actor=admin, reason="Policy review")

    profile.refresh_from_db()
    user.refresh_from_db()
    assert profile.approval_status == AS.SUSPENDED
    assert profile.suspended_at is not None
    # Suspended user keeps is_active=True so they can still sign in.
    assert user.status == User.Status.SUSPENDED
    assert user.is_active is True
    assert _audit_count("employer.suspended") == 1
    # No email for suspension in the MVP.
    assert mail.outbox == []


@pytest.mark.django_db
def test_restore_suspended_employer(make_employer, make_admin):
    admin = make_admin()
    user = make_employer(status=User.Status.SUSPENDED, approval_status=AS.SUSPENDED)
    profile = user.employer_profile
    profile.suspended_at = timezone.now()
    profile.save(update_fields=["suspended_at"])

    approval_service.restore_employer(profile, actor=admin)

    profile.refresh_from_db()
    user.refresh_from_db()
    assert profile.approval_status == AS.APPROVED
    assert profile.suspended_at is None
    assert profile.approved_at is not None
    assert user.status == User.Status.ACTIVE
    assert user.is_active is True
    assert _audit_count("employer.restored") == 1
    assert mail.outbox == []


@pytest.mark.django_db
def test_approve_rejected_employer_allowed(make_employer, make_admin):
    admin = make_admin()
    user = make_employer(status=User.Status.PENDING, approval_status=AS.REJECTED)
    approval_service.approve_employer(user.employer_profile, actor=admin)
    user.employer_profile.refresh_from_db()
    assert user.employer_profile.approval_status == AS.APPROVED


@pytest.mark.django_db
def test_illegal_transitions_rejected(make_employer, make_admin):
    admin = make_admin()
    # Cannot approve an already-approved employer.
    approved = make_employer(status=User.Status.ACTIVE, approval_status=AS.APPROVED)
    with pytest.raises(IllegalTransition):
        approval_service.approve_employer(approved.employer_profile, actor=admin)

    # Cannot suspend a pending employer.
    pending = make_employer(approval_status=AS.PENDING)
    with pytest.raises(IllegalTransition):
        approval_service.suspend_employer(pending.employer_profile, actor=admin)

    # Cannot reject an approved employer.
    with pytest.raises(IllegalTransition):
        approval_service.reject_employer(approved.employer_profile, actor=admin, reason="x")


@pytest.mark.django_db
def test_transition_is_atomic_on_email_failure(make_employer, make_admin, monkeypatch):
    """If the email send raises, the whole transition rolls back."""
    admin = make_admin()
    user = make_employer(status=User.Status.PENDING, approval_status=AS.PENDING)
    profile = user.employer_profile

    def boom(*args, **kwargs):
        raise RuntimeError("smtp down")

    monkeypatch.setattr(approval_service, "send_employer_approved", boom)

    with pytest.raises(RuntimeError):
        approval_service.approve_employer(profile, actor=admin)

    profile.refresh_from_db()
    user.refresh_from_db()
    assert profile.approval_status == AS.PENDING
    assert user.status == User.Status.PENDING
    assert _audit_count("employer.approved") == 0
