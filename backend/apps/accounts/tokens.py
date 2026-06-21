"""Token generators for account email flows.

Password reset reuses Django's built-in ``PasswordResetTokenGenerator``.
Email verification uses a dedicated subclass whose hash incorporates the
``email_verified_at`` timestamp, so a verification link is single-use: once the
timestamp is set the token no longer validates.
"""

from __future__ import annotations

from django.contrib.auth.tokens import PasswordResetTokenGenerator


class EmailVerificationTokenGenerator(PasswordResetTokenGenerator):
    """One-time email-verification token.

    Including ``email_verified_at`` in the hash invalidates the token after the
    address is verified (the value changes from ``None`` to a timestamp).
    """

    def _make_hash_value(self, user, timestamp: int) -> str:
        verified = "" if user.email_verified_at is None else user.email_verified_at.isoformat()
        return f"{user.pk}{user.password}{timestamp}{verified}"


email_verification_token_generator = EmailVerificationTokenGenerator()
