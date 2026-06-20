"""IsApprovedEmployer boundary across employer lifecycle states (spec §22.1).

The approved-employer gate (used for publishing jobs etc.) must admit only an
APPROVED + ACTIVE employer, and deny pending / rejected / suspended employers
even though they can still sign in.
"""

from __future__ import annotations

import pytest
from rest_framework.test import APIRequestFactory

from apps.accounts.models import User
from apps.accounts.permissions import IsApprovedEmployer
from apps.employers.models import EmployerProfile

AS = EmployerProfile.ApprovalStatus


def _allows(user) -> bool:
    request = APIRequestFactory().get("/")
    request.user = user
    return IsApprovedEmployer().has_permission(request, view=None)


@pytest.mark.django_db
@pytest.mark.parametrize(
    "user_status,approval,allowed",
    [
        (User.Status.PENDING, AS.PENDING, False),
        (User.Status.PENDING, AS.REJECTED, False),
        (User.Status.SUSPENDED, AS.SUSPENDED, False),
        (User.Status.ACTIVE, AS.APPROVED, True),
    ],
)
def test_is_approved_employer_boundary(make_employer, user_status, approval, allowed):
    user = make_employer(status=user_status, approval_status=approval)
    assert _allows(user) is allowed


@pytest.mark.django_db
def test_suspended_employer_can_still_sign_in(make_employer):
    user = make_employer(status=User.Status.SUSPENDED, approval_status=AS.SUSPENDED)
    # Gated action denied...
    assert _allows(user) is False
    # ...but the account remains active so a sign-in is still possible.
    assert user.status == User.Status.SUSPENDED
    assert user.is_active is True
