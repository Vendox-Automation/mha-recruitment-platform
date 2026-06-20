"""EmployerProfile model tests (spec §20.3)."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model

from apps.employers.models import EmployerProfile

User = get_user_model()


@pytest.mark.django_db
def test_profile_defaults_to_pending():
    user = User.objects.create_user(
        email="emp@example.com",
        password="Synthetic-Pass-9182",
        role=User.Role.EMPLOYER,
        status=User.Status.PENDING,
    )
    profile = EmployerProfile.objects.create(
        user=user,
        company_name="Synthetic Co",
        contact_person="Contact",
        phone="+60198765432",
    )
    assert profile.approval_status == EmployerProfile.ApprovalStatus.PENDING
    assert profile.is_approved is False
    assert profile.approved_by is None
    assert profile.approved_at is None
    assert user.employer_profile == profile


@pytest.mark.django_db
def test_optional_public_fields_blank_by_default():
    user = User.objects.create_user(
        email="emp2@example.com", password="Synthetic-Pass-9182", role=User.Role.EMPLOYER
    )
    profile = EmployerProfile.objects.create(
        user=user, company_name="Co", contact_person="C", phone="1"
    )
    assert profile.company_summary == ""
    assert profile.website == ""
    assert profile.industry == ""
    assert not profile.logo
