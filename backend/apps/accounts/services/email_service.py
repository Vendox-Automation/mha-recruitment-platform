"""Account email foundation (spec §15.2, §11 email/verification foundations).

Delivery uses the console/file backend in development (ADR-0001 §1.3); the tokens
and links are real. URLs are built from ``FRONTEND_ORIGIN`` so nothing is
hardcoded. Locale-aware copy is kept minimal here and expanded in later i18n work.
"""

from __future__ import annotations

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.utils.http import urlsafe_base64_encode
from django.utils.translation import gettext as _

from apps.accounts.models import User
from apps.accounts.tokens import email_verification_token_generator


def _uid(user: User) -> str:
    return urlsafe_base64_encode(str(user.pk).encode())


def _frontend_url(path: str) -> str:
    origin = getattr(settings, "FRONTEND_ORIGIN", "http://localhost:3000").rstrip("/")
    return f"{origin}{path}"


def send_email_verification(user: User) -> None:
    """Send a verification link. Console backend in dev; real token."""
    token = email_verification_token_generator.make_token(user)
    link = _frontend_url(f"/verify-email?uid={_uid(user)}&token={token}")
    send_mail(
        subject=_("Verify your MHA account email"),
        message=_("Confirm your email address to finish setting up your account:\n%(link)s")
        % {"link": link},
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )


def send_password_reset(user: User) -> None:
    """Send a password-reset link using Django's default token generator."""
    token = default_token_generator.make_token(user)
    link = _frontend_url(f"/reset-password?uid={_uid(user)}&token={token}")
    send_mail(
        subject=_("Reset your MHA account password"),
        message=_("Use the link below to choose a new password:\n%(link)s") % {"link": link},
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
