"""Shared fixtures for administration (admin API) tests — synthetic data only.

Mirrors the factory shape used across the suite: ``make_admin`` /
``make_employer`` / ``make_candidate`` return a ``User``, and ``api`` is a
plain ``APIClient``. These tests force-authenticate and exercise app logic, so
CSRF is not in scope here (it is covered in the accounts suite).
"""

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
def make_admin(db):
    counter = {"n": 0}

    def _make(email: str | None = None) -> User:
        counter["n"] += 1
        email = email or f"admin{counter['n']}@example.com"
        return User.objects.create_superuser(email=email, password=PASSWORD)

    return _make


@pytest.fixture
def make_employer(db):
    counter = {"n": 0}

    def _make(
        *,
        email: str | None = None,
        company_name: str = "Synthetic Co",
        contact_person: str = "Synthetic Contact",
        approval_status: str = EmployerProfile.ApprovalStatus.PENDING,
        account_status: str | None = None,
        **extra,
    ) -> EmployerProfile:
        counter["n"] += 1
        email = email or f"employer{counter['n']}@example.com"
        # Default the account status to a value consistent with approval state.
        if account_status is None:
            account_status = {
                EmployerProfile.ApprovalStatus.APPROVED: User.Status.ACTIVE,
                EmployerProfile.ApprovalStatus.SUSPENDED: User.Status.SUSPENDED,
                EmployerProfile.ApprovalStatus.REJECTED: User.Status.PENDING,
                EmployerProfile.ApprovalStatus.PENDING: User.Status.PENDING,
            }[approval_status]
        user = User.objects.create_user(
            email=email,
            password=PASSWORD,
            role=User.Role.EMPLOYER,
            status=account_status,
        )
        return EmployerProfile.objects.create(
            user=user,
            company_name=company_name,
            contact_person=contact_person,
            phone="+60198765432",
            approval_status=approval_status,
            **extra,
        )

    return _make


@pytest.fixture
def make_candidate(db):
    counter = {"n": 0}

    def _make(email: str | None = None) -> User:
        counter["n"] += 1
        email = email or f"candidate{counter['n']}@example.com"
        user = User.objects.create_user(
            email=email,
            password=PASSWORD,
            role=User.Role.CANDIDATE,
            status=User.Status.ACTIVE,
        )
        CandidateProfile.objects.create(
            user=user,
            full_name="Synthetic Candidate",
            phone="+60123456789",
            preferred_job_title="Analyst",
        )
        return user

    return _make
