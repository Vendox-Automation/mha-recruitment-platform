"""Shared fixtures for reviews tests (synthetic data only).

Mirrors the factory shape used across the suite: ``make_employer`` returns an
``EmployerProfile`` (the review surface keys off the profile + its slug),
``make_candidate`` / ``make_admin`` return a ``User``, and ``api`` is a plain
``APIClient``. These tests force-authenticate / post anonymously and exercise
app logic; throttling is disabled in test settings.
"""

from __future__ import annotations

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile
from apps.employers.models import EmployerProfile
from apps.reviews.models import CompanyReview

PASSWORD = "Synthetic-Pass-9182"


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def make_employer(db):
    counter = {"n": 0}

    def _make(
        *,
        email: str | None = None,
        company_name: str = "Synthetic Co",
        approval_status: str = EmployerProfile.ApprovalStatus.APPROVED,
        account_status: str | None = None,
        **extra,
    ) -> EmployerProfile:
        counter["n"] += 1
        email = email or f"employer{counter['n']}@example.com"
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
            contact_person="Synthetic Contact",
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


@pytest.fixture
def make_admin(db):
    counter = {"n": 0}

    def _make(email: str | None = None) -> User:
        counter["n"] += 1
        email = email or f"admin{counter['n']}@example.com"
        return User.objects.create_superuser(email=email, password=PASSWORD)

    return _make


@pytest.fixture
def make_review(db):
    """Create a CompanyReview directly (bypasses throttling/serializers)."""

    counter = {"n": 0}

    def _make(employer: EmployerProfile, *, rating: int = 5, **kwargs) -> CompanyReview:
        counter["n"] += 1
        defaults = {
            "reviewer_name": f"Reviewer {counter['n']}",
            "reviewer_email": f"reviewer{counter['n']}@example.com",
            "rating": rating,
            "title": "Synthetic title",
            "body": "Synthetic body.",
        }
        defaults.update(kwargs)
        return CompanyReview.objects.create(employer=employer, **defaults)

    return _make
