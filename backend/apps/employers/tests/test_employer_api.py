"""Employer profile + approval-status API tests (spec §21.3, §22.1).

Covers object scoping (own profile only), non-settable approval fields, and the
approval-status payload across all four lifecycle states.
"""

from __future__ import annotations

import pytest
from django.urls import reverse

from apps.accounts.models import User
from apps.employers.models import EmployerProfile

AS = EmployerProfile.ApprovalStatus

PROFILE_URL = reverse("employers:profile")
STATUS_URL = reverse("employers:approval-status")


@pytest.mark.django_db
def test_get_profile_returns_own(make_employer, api):
    user = make_employer(approval_status=AS.PENDING)
    api.force_authenticate(user=user)
    resp = api.get(PROFILE_URL)
    assert resp.status_code == 200
    assert resp.data["company_name"] == "Synthetic Co"
    assert resp.data["approval_status"] == AS.PENDING


@pytest.mark.django_db
def test_patch_profile_updates_allowed_fields(make_employer, api):
    user = make_employer(approval_status=AS.PENDING)
    api.force_authenticate(user=user)
    resp = api.patch(
        PROFILE_URL,
        {"company_name": "Renamed Co", "industry": "Fintech", "website": "https://example.com"},
        format="json",
    )
    assert resp.status_code == 200
    user.employer_profile.refresh_from_db()
    assert user.employer_profile.company_name == "Renamed Co"
    assert user.employer_profile.industry == "Fintech"


@pytest.mark.django_db
def test_patch_cannot_set_approval_fields(make_employer, api):
    """Approval lifecycle fields are read-only; PATCH must ignore them."""
    user = make_employer(status=User.Status.PENDING, approval_status=AS.PENDING)
    api.force_authenticate(user=user)
    resp = api.patch(
        PROFILE_URL,
        {
            "approval_status": AS.APPROVED,
            "approval_reason": "self approved",
            "company_name": "Legit Update",
        },
        format="json",
    )
    assert resp.status_code == 200
    profile = user.employer_profile
    profile.refresh_from_db()
    user.refresh_from_db()
    # The legit field changed; the approval fields did NOT.
    assert profile.company_name == "Legit Update"
    assert profile.approval_status == AS.PENDING
    assert profile.approval_reason == ""
    assert user.status == User.Status.PENDING


@pytest.mark.django_db
def test_employer_only_ever_sees_own_profile(make_employer, api):
    """There is no id in the path; a second employer sees only their own row."""
    other = make_employer(email="other@example.com")
    other.employer_profile.company_name = "Other Co"
    other.employer_profile.save(update_fields=["company_name"])

    me = make_employer(email="me@example.com")
    api.force_authenticate(user=me)
    resp = api.get(PROFILE_URL)
    assert resp.status_code == 200
    assert resp.data["company_name"] == "Synthetic Co"
    assert resp.data["company_name"] != "Other Co"


@pytest.mark.django_db
def test_patch_only_mutates_own_profile(make_employer, api):
    other = make_employer(email="other@example.com")
    me = make_employer(email="me@example.com")
    api.force_authenticate(user=me)
    api.patch(PROFILE_URL, {"company_name": "Mine Only"}, format="json")

    other.employer_profile.refresh_from_db()
    me.employer_profile.refresh_from_db()
    assert me.employer_profile.company_name == "Mine Only"
    assert other.employer_profile.company_name == "Synthetic Co"


@pytest.mark.django_db
def test_candidate_cannot_access_employer_profile(make_candidate, api):
    candidate = make_candidate()
    api.force_authenticate(user=candidate)
    assert api.get(PROFILE_URL).status_code == 403
    assert api.get(STATUS_URL).status_code == 403


@pytest.mark.django_db
def test_anonymous_denied(api):
    assert api.get(PROFILE_URL).status_code in (401, 403)
    assert api.get(STATUS_URL).status_code in (401, 403)


@pytest.mark.django_db
@pytest.mark.parametrize(
    "user_status,approval,expected_can_publish",
    [
        (User.Status.PENDING, AS.PENDING, False),
        (User.Status.ACTIVE, AS.APPROVED, True),
        (User.Status.PENDING, AS.REJECTED, False),
        (User.Status.SUSPENDED, AS.SUSPENDED, False),
    ],
)
def test_approval_status_endpoint(make_employer, api, user_status, approval, expected_can_publish):
    user = make_employer(status=user_status, approval_status=approval)
    if approval == AS.REJECTED:
        user.employer_profile.approval_reason = "Needs more info"
        user.employer_profile.save(update_fields=["approval_reason"])
    api.force_authenticate(user=user)

    resp = api.get(STATUS_URL)
    assert resp.status_code == 200
    assert resp.data["approval_status"] == approval
    assert resp.data["can_publish"] is expected_can_publish
    assert resp.data["company_name"] == "Synthetic Co"
    if approval == AS.REJECTED:
        assert resp.data["approval_reason"] == "Needs more info"
    else:
        # Reason only surfaced when rejected.
        assert resp.data["approval_reason"] == ""
