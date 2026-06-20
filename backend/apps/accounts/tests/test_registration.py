"""Registration endpoint behaviour (spec §21.1, §14.7–14.8)."""

from __future__ import annotations

import pytest
from django.core import mail

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile
from apps.employers.models import EmployerProfile

from .conftest import PASSWORD

CAND_URL = "/api/v1/auth/register/candidate/"
EMP_URL = "/api/v1/auth/register/employer/"


@pytest.mark.django_db
def test_candidate_registration_creates_user_and_profile(api):
    payload = {
        "email": "new.candidate@example.com",
        "password": PASSWORD,
        "full_name": "New Candidate",
        "phone": "+60111111111",
        "preferred_job_title": "Engineer",
    }
    response = api.post(CAND_URL, payload, format="json")
    assert response.status_code == 201
    body = response.json()
    assert body["role"] == User.Role.CANDIDATE
    assert body["status"] == User.Status.ACTIVE
    assert body["profile"]["full_name"] == "New Candidate"
    assert "password" not in body

    user = User.objects.get(email="new.candidate@example.com")
    assert CandidateProfile.objects.filter(user=user).exists()
    # Logged in: session cookie issued.
    assert response.cookies.get("sessionid")
    # Verification email sent (foundation).
    assert len(mail.outbox) == 1


@pytest.mark.django_db
def test_employer_registration_creates_pending_account(api):
    payload = {
        "email": "new.employer@example.com",
        "password": PASSWORD,
        "company_name": "Acme Synthetic",
        "contact_person": "Jordan Lee",
        "phone": "+60122222222",
    }
    response = api.post(EMP_URL, payload, format="json")
    assert response.status_code == 201
    body = response.json()
    assert body["role"] == User.Role.EMPLOYER
    assert body["status"] == User.Status.PENDING
    assert body["profile"]["approval_status"] == EmployerProfile.ApprovalStatus.PENDING

    user = User.objects.get(email="new.employer@example.com")
    profile = EmployerProfile.objects.get(user=user)
    assert profile.approval_status == EmployerProfile.ApprovalStatus.PENDING


@pytest.mark.django_db
def test_candidate_registration_rejects_duplicate_email(api, make_candidate):
    make_candidate(email="taken@example.com")
    payload = {
        "email": "TAKEN@example.com",  # case-insensitive collision
        "password": PASSWORD,
        "full_name": "Dup",
        "phone": "+60133333333",
        "preferred_job_title": "Engineer",
    }
    response = api.post(CAND_URL, payload, format="json")
    assert response.status_code == 400
    assert "email" in response.json()["fields"]


@pytest.mark.django_db
def test_candidate_registration_rejects_weak_password(api):
    payload = {
        "email": "weak@example.com",
        "password": "123",
        "full_name": "Weak",
        "phone": "+60144444444",
        "preferred_job_title": "Engineer",
    }
    response = api.post(CAND_URL, payload, format="json")
    assert response.status_code == 400
    assert "password" in response.json()["fields"]


@pytest.mark.django_db
def test_candidate_registration_requires_required_fields(api):
    response = api.post(CAND_URL, {"email": "x@example.com"}, format="json")
    assert response.status_code == 400
    fields = response.json()["fields"]
    for required in ("password", "full_name", "phone", "preferred_job_title"):
        assert required in fields


@pytest.mark.django_db
def test_registration_is_atomic_when_profile_invalid(api, monkeypatch):
    """If profile creation fails, the User is rolled back (no orphan user)."""
    from apps.accounts.services import registration_service

    def boom(*args, **kwargs):
        raise RuntimeError("profile boom")

    monkeypatch.setattr(registration_service.CandidateProfile.objects, "create", boom)
    payload = {
        "email": "atomic@example.com",
        "password": PASSWORD,
        "full_name": "Atomic",
        "phone": "+60155555555",
        "preferred_job_title": "Engineer",
    }
    with pytest.raises(RuntimeError):
        api.post(CAND_URL, payload, format="json")
    assert not User.objects.filter(email="atomic@example.com").exists()
