"""Shared fixtures for jobs tests (synthetic data only)."""

from __future__ import annotations

from datetime import timedelta

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.employers.models import EmployerProfile
from apps.jobs.models import Job

PASSWORD = "Synthetic-Pass-9182"


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def make_employer(db):
    counter = {"n": 0}

    def _make(
        email: str | None = None,
        company_name: str = "Synthetic Co",
        status: str = User.Status.ACTIVE,
        approval_status: str = EmployerProfile.ApprovalStatus.APPROVED,
    ) -> User:
        counter["n"] += 1
        email = email or f"employer{counter['n']}@example.com"
        user = User.objects.create_user(
            email=email, password=PASSWORD, role=User.Role.EMPLOYER, status=status
        )
        EmployerProfile.objects.create(
            user=user,
            company_name=company_name,
            contact_person="Synthetic Contact",
            phone="+60198765432",
            approval_status=approval_status,
        )
        return user

    return _make


@pytest.fixture
def make_candidate(db):
    counter = {"n": 0}

    def _make(email: str | None = None) -> User:
        counter["n"] += 1
        email = email or f"candidate{counter['n']}@example.com"
        return User.objects.create_user(
            email=email, password=PASSWORD, role=User.Role.CANDIDATE, status=User.Status.ACTIVE
        )

    return _make


@pytest.fixture
def make_admin(db):
    def _make(email: str = "admin@example.com") -> User:
        return User.objects.create_superuser(email=email, password=PASSWORD)

    return _make


@pytest.fixture
def make_job(db):
    """Create a Job with sensible defaults; pass overrides as kwargs."""

    def _make(employer=None, **kwargs) -> Job:
        defaults = {
            "title": "Senior Data Analyst",
            "location": "Kuala Lumpur",
            "employment_type": Job.EmploymentType.FULL_TIME,
            "description": "Build analytical dashboards.",
            "requirements": "SQL and Python experience.",
            "status": Job.Status.PUBLISHED,
            "published_at": timezone.now(),
            "salary_disclosed": True,
            "salary_min": 5000,
            "salary_max": 8000,
            "created_by": employer.user if employer else None,
            "source_type": (
                Job.SourceType.EMPLOYER_PARTNER if employer else Job.SourceType.MHA_DIRECT
            ),
        }
        defaults.update(kwargs)
        return Job.objects.create(employer=employer, **defaults)

    return _make


@pytest.fixture
def future_date():
    return timezone.localdate() + timedelta(days=30)


@pytest.fixture
def past_date():
    return timezone.localdate() - timedelta(days=1)
