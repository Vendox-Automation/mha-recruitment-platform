"""Shared fixtures for analytics tests (synthetic data only)."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile
from apps.employers.models import EmployerProfile

PASSWORD = "Synthetic-Pass-9182"


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def make_employer(db):
    counter = {"n": 0}

    def _make(company_name: str | None = None, email: str | None = None) -> EmployerProfile:
        counter["n"] += 1
        email = email or f"employer{counter['n']}@example.com"
        user = User.objects.create_user(
            email=email,
            password=PASSWORD,
            role=User.Role.EMPLOYER,
            status=User.Status.ACTIVE,
        )
        return EmployerProfile.objects.create(
            user=user,
            company_name=company_name or f"Synthetic Co {counter['n']}",
            contact_person="Synthetic Contact",
            phone="+60198765432",
            approval_status=EmployerProfile.ApprovalStatus.APPROVED,
        )

    return _make


@pytest.fixture
def make_candidate(db):
    counter = {"n": 0}

    def _make(email: str | None = None) -> CandidateProfile:
        counter["n"] += 1
        email = email or f"cand{counter['n']}@example.com"
        user = User.objects.create_user(
            email=email,
            password=PASSWORD,
            role=User.Role.CANDIDATE,
            status=User.Status.ACTIVE,
        )
        return CandidateProfile.objects.create(
            user=user,
            full_name="Synthetic Candidate",
            phone="+60123456789",
            preferred_job_title="Analyst",
        )

    return _make
