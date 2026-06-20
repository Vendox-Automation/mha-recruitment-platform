"""Shared fixtures for candidate API tests (synthetic data only)."""

from __future__ import annotations

import io
import zipfile

import pytest
from rest_framework.test import APIClient

from apps.accounts.models import User
from apps.candidates.models import CandidateProfile

PASSWORD = "Synthetic-Pass-9182"


@pytest.fixture
def api() -> APIClient:
    return APIClient()


@pytest.fixture
def make_candidate(db):
    counter = {"n": 0}

    def _make(email: str | None = None, **profile_kwargs) -> User:
        counter["n"] += 1
        email = email or f"candidate{counter['n']}@example.com"
        user = User.objects.create_user(
            email=email,
            password=PASSWORD,
            role=User.Role.CANDIDATE,
            status=User.Status.ACTIVE,
        )
        defaults = {
            "full_name": "Synthetic Candidate",
            "phone": "+60123456789",
            "preferred_job_title": "Analyst",
        }
        defaults.update(profile_kwargs)
        CandidateProfile.objects.create(user=user, **defaults)
        return user

    return _make


@pytest.fixture
def make_employer(db):
    from apps.employers.models import EmployerProfile

    def _make(email: str = "employer@example.com") -> User:
        user = User.objects.create_user(
            email=email,
            password=PASSWORD,
            role=User.Role.EMPLOYER,
            status=User.Status.ACTIVE,
        )
        EmployerProfile.objects.create(
            user=user,
            company_name="Synthetic Co",
            contact_person="Synthetic Contact",
            phone="+60198765432",
            approval_status=EmployerProfile.ApprovalStatus.APPROVED,
        )
        return user

    return _make


# --- Crafted file builders (magic bytes matter) ---------------------------


def pdf_bytes(payload: bytes = b"synthetic resume body") -> bytes:
    """Minimal bytes that start with the PDF magic signature."""
    return b"%PDF-1.4\n" + payload + b"\n%%EOF\n"


def docx_bytes() -> bytes:
    """A real (minimal) OOXML DOCX: a ZIP with the required members."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0"?><Types '
            'xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
        )
        zf.writestr("word/document.xml", "<document/>")
    return buf.getvalue()


def plain_zip_bytes() -> bytes:
    """A valid ZIP that is NOT a DOCX (no OOXML members)."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("data.txt", "not a document")
    return buf.getvalue()
