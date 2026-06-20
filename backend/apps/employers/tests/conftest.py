"""Shared fixtures for employer tests."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile
from apps.employers.models import EmployerProfile

PASSWORD = "Synthetic-Pass-9182"


@pytest.fixture
def api() -> APIClient:
    # CSRF disabled here: these tests force-authenticate and exercise app logic,
    # not the CSRF transport (which is covered in the accounts suite).
    return APIClient()


@pytest.fixture
def make_employer(db):
    counter = {"n": 0}

    def _make(
        email: str | None = None,
        status: str = User.Status.PENDING,
        approval_status: str = EmployerProfile.ApprovalStatus.PENDING,
    ) -> User:
        counter["n"] += 1
        email = email or f"employer{counter['n']}@example.com"
        user = User.objects.create_user(
            email=email, password=PASSWORD, role=User.Role.EMPLOYER, status=status
        )
        EmployerProfile.objects.create(
            user=user,
            company_name="Synthetic Co",
            contact_person="Synthetic Contact",
            phone="+60198765432",
            approval_status=approval_status,
        )
        return user

    return _make


@pytest.fixture
def make_candidate(db):
    def _make(email: str = "candidate@example.com") -> User:
        user = User.objects.create_user(
            email=email, password=PASSWORD, role=User.Role.CANDIDATE, status=User.Status.ACTIVE
        )
        CandidateProfile.objects.create(
            user=user,
            full_name="Synthetic Candidate",
            phone="+60123456789",
            preferred_job_title="Analyst",
        )
        return user

    return _make


@pytest.fixture
def make_admin(db):
    def _make(email: str = "admin@example.com") -> User:
        return User.objects.create_superuser(email=email, password=PASSWORD)

    return _make
