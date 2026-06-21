"""Shared fixtures for application tests (synthetic data only)."""

from __future__ import annotations

import pytest
from django.core.files.base import ContentFile
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile
from apps.employers.models import EmployerProfile
from apps.jobs.models import Job, ScreeningQuestion

PASSWORD = "Synthetic-Pass-9182"
VALID_PDF = b"%PDF-1.4\n%fake pdf bytes for tests\n"


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def make_candidate(db):
    counter = {"n": 0}

    def _make(*, with_resume: bool = True, email: str | None = None) -> CandidateProfile:
        counter["n"] += 1
        email = email or f"cand{counter['n']}@example.com"
        user = User.objects.create_user(
            email=email, password=PASSWORD, role=User.Role.CANDIDATE, status=User.Status.ACTIVE
        )
        profile = CandidateProfile.objects.create(
            user=user,
            full_name="Test Candidate",
            phone="+60123456789",
            preferred_job_title="Data Analyst",
        )
        if with_resume:
            profile.resume_file.save("cv.pdf", ContentFile(VALID_PDF), save=False)
            profile.resume_original_name = "cv.pdf"
            profile.resume_uploaded_at = timezone.now()
            profile.save()
        return profile

    return _make


@pytest.fixture
def approved_employer(db):
    user = User.objects.create_user(
        email="emp@example.com",
        password=PASSWORD,
        role=User.Role.EMPLOYER,
        status=User.Status.ACTIVE,
    )
    return EmployerProfile.objects.create(
        user=user,
        company_name="Synthetic Co",
        contact_person="Hiring Lead",
        phone="+60198765432",
        approval_status=EmployerProfile.ApprovalStatus.APPROVED,
    )


@pytest.fixture
def make_job(db, approved_employer):
    def _make(*, status: str = Job.Status.PUBLISHED, employer=None, **kwargs) -> Job:
        employer = approved_employer if employer is None else employer
        defaults = {
            "title": "Senior Data Analyst",
            "location": "Kuala Lumpur",
            "employment_type": Job.EmploymentType.FULL_TIME,
            "description": "Build dashboards.",
            "requirements": "SQL, Python.",
            "status": status,
            "published_at": timezone.now(),
            "salary_disclosed": True,
            "salary_min": 6000,
            "salary_max": 9000,
            "created_by": employer.user,
            "source_type": Job.SourceType.EMPLOYER_PARTNER,
        }
        defaults.update(kwargs)
        return Job.objects.create(employer=employer, **defaults)

    return _make


@pytest.fixture
def login(api):
    def _login(profile: CandidateProfile):
        api.force_authenticate(user=profile.user)
        return api

    return _login


def add_question(job, *, qtype, required=True, options=None, order=0):
    return ScreeningQuestion.objects.create(
        job=job,
        question="Question?",
        question_type=qtype,
        is_required=required,
        options_json=options or [],
        display_order=order,
    )
