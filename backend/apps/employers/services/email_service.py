"""Transactional employer-approval emails (spec §15.2).

Delivery uses the console backend in development and the locmem backend in tests
(ADR-0001 §1.3); the copy is real. Links are built from ``FRONTEND_ORIGIN`` so
nothing is hardcoded. Subjects/bodies are wrapped in ``gettext`` so they are
i18n-ready; the rejection email includes the (non-sensitive) reason so the
employer understands what to fix before resubmitting.

These are called from inside the approval service's transaction. If delivery
raises, the surrounding ``transaction.atomic`` rolls the state change back, so we
never record an approval whose notification silently failed.
"""

from __future__ import annotations

from django.conf import settings
from django.core.mail import send_mail
from django.utils.translation import gettext as _

from apps.accounts.models import User


def _frontend_url(path: str) -> str:
    origin = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000").rstrip("/")
    return f"{origin}{path}"


def send_employer_approved(user: User) -> None:
    """Notify an employer that their account has been approved."""
    link = _frontend_url("/employer/dashboard")
    send_mail(
        subject=_("Your MHA employer account has been approved"),
        message=_(
            "Good news — your employer account has been approved. "
            "You can now publish jobs and review candidates:\n%(link)s"
        )
        % {"link": link},
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_employer_rejected(user: User, reason: str) -> None:
    """Notify an employer that their account was not approved.

    ``reason`` is shown to the employer, so callers must pass only
    non-sensitive, employer-facing text.
    """
    link = _frontend_url("/employer/approval-status")
    clean_reason = (reason or "").strip()
    if clean_reason:
        body = _(
            "Thank you for registering with MHA. After review, your employer "
            "account was not approved at this time.\n\nReason: %(reason)s\n\n"
            "You can update your details and resubmit here:\n%(link)s"
        ) % {"reason": clean_reason, "link": link}
    else:
        body = _(
            "Thank you for registering with MHA. After review, your employer "
            "account was not approved at this time.\n\n"
            "You can update your details and resubmit here:\n%(link)s"
        ) % {"link": link}
    send_mail(
        subject=_("Update on your MHA employer account"),
        message=body,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
