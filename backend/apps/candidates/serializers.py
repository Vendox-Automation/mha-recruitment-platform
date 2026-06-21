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

from apps.candidates.models import CandidateProfile, SavedJob
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


class SavedJobSerializer(serializers.ModelSerializer):
    """A saved-job row: when it was saved + a compact, safe job summary.

    ``is_available`` reflects whether the underlying job is still publicly
    visible (``Job.objects.public()``); an unavailable job is LABELLED, not
    hidden (spec §15.5). Only presentation-safe job fields are exposed — the
    same fields a public listing row shows — and salary figures the employer
    chose not to disclose are blanked, matching the public job surface.
    """

    job = serializers.SerializerMethodField()
    is_available = serializers.SerializerMethodField()

    class Meta:
        model = SavedJob
        fields = ["id", "created_at", "is_available", "job"]
        read_only_fields = fields

    def get_is_available(self, obj: SavedJob) -> bool:
        """Whether the saved job is still publicly visible (spec §15.5).

        The view passes the set of currently-public job ids in ``context`` so a
        list render runs a single ``public()`` membership query instead of one
        per row; falls back to a per-row check if the context is absent.
        """
        available = self.context.get("available_job_ids")
        if available is not None:
            return obj.job_id in available
        from apps.jobs.models import Job

        return Job.objects.public().filter(pk=obj.job_id).exists()

    def get_job(self, obj: SavedJob) -> dict[str, Any]:
        job = obj.job
        company = None
        if job.employer_id is not None:
            company = {
                "slug": job.employer.slug,
                "company_name": job.employer.company_name,
            }
        salary_min = job.salary_min if job.salary_disclosed else None
        salary_max = job.salary_max if job.salary_disclosed else None
        return {
            # The job id is needed by the owner to unsave (DELETE
            # /candidate/saved-jobs/{job_id}/, spec §21.2); it is the
            # candidate's own bookmark, so exposing it to them leaks nothing.
            "id": str(job.id),
            "slug": job.slug,
            "title": job.title,
            "location": job.location,
            "employment_type": job.employment_type,
            "salary_min": salary_min,
            "salary_max": salary_max,
            "salary_currency": job.salary_currency,
            "salary_period": job.salary_period,
            "salary_disclosed": job.salary_disclosed,
            "status": job.status,
            "is_mha_supported": job.is_mha_supported,
            "company": company,
        }
