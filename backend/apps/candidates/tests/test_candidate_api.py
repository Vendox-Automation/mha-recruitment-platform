"""Candidate profile + dashboard API tests (spec §14.7, §14.9, §21.2)."""

from __future__ import annotations

import pytest

from apps.candidates.models import CandidateProfile

PROFILE_URL = "/api/v1/candidate/profile/"
DASHBOARD_URL = "/api/v1/candidate/dashboard/"


@pytest.mark.django_db
def test_get_profile_returns_own_data(api, make_candidate):
    user = make_candidate(full_name="Owner Name")
    api.force_authenticate(user)
    resp = api.get(PROFILE_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert body["full_name"] == "Owner Name"
    assert body["has_resume"] is False
    assert body["profile_completion"]["percent"] == 50  # 3 of 6 checks


@pytest.mark.django_db
def test_patch_updates_own_profile(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    resp = api.patch(
        PROFILE_URL,
        {"full_name": "Updated Name", "preferred_location": "Penang"},
        format="json",
    )
    assert resp.status_code == 200
    profile = CandidateProfile.objects.get(user=user)
    assert profile.full_name == "Updated Name"
    assert profile.preferred_location == "Penang"


@pytest.mark.django_db
def test_patch_cannot_write_resume_fields(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    resp = api.patch(
        PROFILE_URL,
        {
            "resume_original_name": "injected.pdf",
            "resume_parsing_status": "COMPLETED",
            "full_name": "Real Name",
        },
        format="json",
    )
    assert resp.status_code == 200
    profile = CandidateProfile.objects.get(user=user)
    # Read-only resume fields were ignored; only full_name changed.
    assert profile.resume_original_name == ""
    assert profile.resume_parsing_status == CandidateProfile.ResumeParsingStatus.NONE
    assert profile.full_name == "Real Name"


@pytest.mark.django_db
def test_profile_is_scoped_to_signed_in_user(api, make_candidate):
    a = make_candidate(email="a@example.com", full_name="Candidate A")
    b = make_candidate(email="b@example.com", full_name="Candidate B")
    api.force_authenticate(b)
    # No id parameter exists; b can only ever see b's profile.
    resp = api.get(PROFILE_URL)
    assert resp.json()["full_name"] == "Candidate B"
    # And a PATCH only ever mutates b.
    api.patch(PROFILE_URL, {"full_name": "B Edited"}, format="json")
    a.refresh_from_db()
    assert CandidateProfile.objects.get(user=a).full_name == "Candidate A"


@pytest.mark.django_db
def test_anonymous_denied_profile(api):
    assert api.get(PROFILE_URL).status_code in (401, 403)


@pytest.mark.django_db
def test_dashboard_returns_honest_zero_stats(api, make_candidate):
    user = make_candidate(preferred_location="KL")
    api.force_authenticate(user)
    resp = api.get(DASHBOARD_URL)
    assert resp.status_code == 200
    body = resp.json()
    assert body["applications"]["total"] == 0
    assert body["applications"]["recent"] == []
    assert body["saved_jobs"]["total"] == 0
    assert body["resume"]["has_resume"] is False
    assert "percent" in body["profile_completion"]
    assert body["preferences"]["preferred_location"] == "KL"


@pytest.mark.django_db
def test_dashboard_anonymous_denied(api):
    assert api.get(DASHBOARD_URL).status_code in (401, 403)
