"""Shared fixtures for support API tests (synthetic data only)."""

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
    def _make(email: str = "admin@example.com") -> User:
        return User.objects.create_user(
            email=email,
            password=PASSWORD,
            role=User.Role.ADMIN,
            status=User.Status.ACTIVE,
        )

    return _make


def pdf_bytes(payload: bytes = b"synthetic support body") -> bytes:
    return b"%PDF-1.4\n" + payload + b"\n%%EOF\n"


def docx_bytes() -> bytes:
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0"?><Types '
            'xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>',
        )
        zf.writestr("word/document.xml", "<document/>")
    return buf.getvalue()
