"""CandidateProfile model tests (spec §20.2)."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

from apps.candidates.models import CandidateProfile

User = get_user_model()


@pytest.mark.django_db
def test_profile_defaults_and_helpers():
    user = User.objects.create_user(
        email="cand@example.com", password="Synthetic-Pass-9182", role=User.Role.CANDIDATE
    )
    profile = CandidateProfile.objects.create(
        user=user,
        full_name="Synthetic Candidate",
        phone="+60123456789",
        preferred_job_title="Analyst",
    )
    assert profile.resume_parsing_status == CandidateProfile.ResumeParsingStatus.NONE
    assert profile.resume_extracted_keywords_json == []
    assert profile.has_resume is False
    # 3 of 5 basic checks satisfied (no location, no resume).
    assert profile.profile_completion == 60
    assert user.candidate_profile == profile


@pytest.mark.django_db
def test_profile_is_one_to_one():
    user = User.objects.create_user(email="one@example.com", password="Synthetic-Pass-9182")
    CandidateProfile.objects.create(user=user, full_name="A", phone="1", preferred_job_title="x")
    with pytest.raises(IntegrityError):
        CandidateProfile.objects.create(
            user=user, full_name="B", phone="2", preferred_job_title="y"
        )
