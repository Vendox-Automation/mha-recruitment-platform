"""Registration workflows (multi-record creation kept out of serializers/views).

Both flows create a ``User`` and its profile atomically (ADR-0001 §6.1.8) and
send a verification email as a foundation. Session login (rotation) is performed
by the view, which owns the request/response cycle.
"""

from __future__ import annotations

from typing import Any

from django.db import transaction

from apps.accounts.models import User
from apps.accounts.services.email_service import send_email_verification
from apps.candidates.models import CandidateProfile
from apps.employers.models import EmployerProfile


@transaction.atomic
def register_candidate(
    *,
    email: str,
    password: str,
    full_name: str,
    phone: str,
    preferred_job_title: str,
    preferred_location: str = "",
    preferred_employment_type: str = "",
    preferred_locale: str | None = None,
) -> User:
    """Create an ACTIVE candidate User + CandidateProfile in one transaction."""
    extra: dict[str, Any] = {
        "role": User.Role.CANDIDATE,
        "status": User.Status.ACTIVE,
    }
    if preferred_locale:
        extra["preferred_locale"] = preferred_locale

    user = User.objects.create_user(email=email, password=password, **extra)
    CandidateProfile.objects.create(
        user=user,
        full_name=full_name,
        phone=phone,
        preferred_job_title=preferred_job_title,
        preferred_location=preferred_location,
        preferred_employment_type=preferred_employment_type,
    )
    # Send after the records exist; if delivery raised, the whole tx rolls back.
    send_email_verification(user)
    return user


@transaction.atomic
def register_employer(
    *,
    email: str,
    password: str,
    company_name: str,
    contact_person: str,
    phone: str,
    preferred_locale: str | None = None,
) -> User:
    """Create a PENDING employer User + EmployerProfile(PENDING) atomically."""
    extra: dict[str, Any] = {
        "role": User.Role.EMPLOYER,
        "status": User.Status.PENDING,
    }
    if preferred_locale:
        extra["preferred_locale"] = preferred_locale

    user = User.objects.create_user(email=email, password=password, **extra)
    EmployerProfile.objects.create(
        user=user,
        company_name=company_name,
        contact_person=contact_person,
        phone=phone,
        approval_status=EmployerProfile.ApprovalStatus.PENDING,
    )
    send_email_verification(user)
    return user
