"""Candidate API serializers (spec §21.2).

Explicit fields only (no ``__all__``, spec §22.1). Resume bytes are private:
these serializers expose only display metadata (``resume_original_name``,
``resume_uploaded_at``, ``has_resume``) and NEVER the FileField's ``.url`` or
storage path. The resume itself is written/removed via the resume endpoints and
served only by the permission-checked download view.
"""

from __future__ import annotations

from typing import Any

from rest_framework import serializers

from apps.candidates.models import CandidateProfile
from apps.candidates.selectors import profile_completion


class CandidateProfileSerializer(serializers.ModelSerializer):
    """Read + safe edit of the signed-in candidate's own profile.

    Editable: the basic profile + preference fields. Resume fields and all
    audit/parsing columns are strictly read-only here (the resume is managed via
    ``/candidate/resume/``). The account-level locale is handled separately by
    ``/auth/me/`` and is intentionally not duplicated as a writable field here.
    """

    has_resume = serializers.BooleanField(read_only=True)
    profile_completion = serializers.SerializerMethodField()

    class Meta:
        model = CandidateProfile
        fields = [
            "full_name",
            "phone",
            "preferred_job_title",
            "preferred_location",
            "preferred_employment_type",
            # Resume metadata — read-only display only, never a URL/path.
            "has_resume",
            "resume_original_name",
            "resume_uploaded_at",
            "resume_parsing_status",
            "profile_completion",
            "updated_at",
        ]
        read_only_fields = [
            "has_resume",
            "resume_original_name",
            "resume_uploaded_at",
            "resume_parsing_status",
            "profile_completion",
            "updated_at",
        ]
        extra_kwargs = {
            # Required basic fields stay required on full updates but optional on
            # PATCH; the view always uses partial=True so partial edits work.
            "full_name": {"required": False},
            "phone": {"required": False},
            "preferred_job_title": {"required": False},
        }

    def get_profile_completion(self, profile: CandidateProfile) -> dict[str, Any]:
        return profile_completion(profile)


class ResumeMetadataSerializer(serializers.Serializer):
    """Resume metadata returned after upload / on status — never the bytes."""

    def to_representation(self, profile: CandidateProfile) -> dict[str, Any]:
        return {
            "has_resume": profile.has_resume,
            "original_name": profile.resume_original_name or None,
            "uploaded_at": profile.resume_uploaded_at,
            "parsing_status": profile.resume_parsing_status,
        }
