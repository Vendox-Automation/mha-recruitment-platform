"""Shared fixtures for Smart Job Fit tests (synthetic data only)."""

from __future__ import annotations

import io
import zipfile

import pytest
from django.utils import timezone
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile
from apps.employers.models import EmployerProfile
from apps.jobs.models import Job

PASSWORD = "Synthetic-Pass-9182"


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def make_candidate(db):
    counter = {"n": 0}

    def _make(**profile_kwargs) -> CandidateProfile:
        counter["n"] += 1
        user = User.objects.create_user(
            email=f"cand{counter['n']}@example.com",
            password=PASSWORD,
            role=User.Role.CANDIDATE,
            status=User.Status.ACTIVE,
        )
        defaults = {
            "full_name": "Synthetic Candidate",
            "phone": "+60123456789",
            "preferred_job_title": "Data Analyst",
            "preferred_location": "Kuala Lumpur",
            "preferred_employment_type": Job.EmploymentType.FULL_TIME,
        }
        defaults.update(profile_kwargs)
        return CandidateProfile.objects.create(user=user, **defaults)

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
    def _make(*, status: str = Job.Status.PUBLISHED, **kwargs) -> Job:
        defaults = {
            "title": "Senior Data Analyst",
            "location": "Kuala Lumpur",
            "employment_type": Job.EmploymentType.FULL_TIME,
            "description": "Build dashboards.",
            "requirements": "SQL Python Tableau reporting",
            "status": status,
            "published_at": timezone.now(),
            "created_by": approved_employer.user,
            "source_type": Job.SourceType.EMPLOYER_PARTNER,
        }
        defaults.update(kwargs)
        return Job.objects.create(employer=approved_employer, **defaults)

    return _make


def docx_bytes(body_text: str) -> bytes:
    """A minimal real OOXML DOCX containing ``body_text`` in word/document.xml."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0"?><Types '
            'xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
        )
        zf.writestr(
            "word/document.xml",
            f"<document><body><p><r><t>{body_text}</t></r></p></body></document>",
        )
    return buf.getvalue()
