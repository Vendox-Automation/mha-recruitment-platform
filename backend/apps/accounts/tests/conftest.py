"""Shared fixtures for account/auth tests."""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile
from apps.employers.models import EmployerProfile

PASSWORD = "Synthetic-Pass-9182"


@pytest.fixture
def api() -> APIClient:
    # enforce_csrf_checks mirrors production session-auth behaviour.
    return APIClient(enforce_csrf_checks=True)


@pytest.fixture
def make_candidate(db):
    def _make(email="candidate@example.com", status=User.Status.ACTIVE):
        user = User.objects.create_user(
            email=email, password=PASSWORD, role=User.Role.CANDIDATE, status=status
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
def make_employer(db):
    def _make(
        email="employer@example.com",
        status=User.Status.PENDING,
        approval_status=EmployerProfile.ApprovalStatus.PENDING,
    ):
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
def make_admin(db):
    def _make(email="admin@example.com"):
        return User.objects.create_superuser(email=email, password=PASSWORD)

    return _make
