"""Employer-facing application serializers (spec §14.12, §21.5, §22.1).

These are deliberately SEPARATE from the candidate-facing serializers in
``serializers.py``. The employer is reviewing applicants *to their own jobs*, so
this surface DOES expose:

  * the applicant's contact details (name, phone) and review-relevant profile
    fields — the candidate chose to apply to this employer's job, so the employer
    they applied to may see what they need to evaluate them (§14.12 split-screen
    "candidate profile");
  * the employer's own private notes (``employer_private_notes``), which remain
    invisible to candidates (the candidate serializers never include them).

It does NOT expose: the candidate's account login email (contact is the
profile ``phone``), the raw resume storage path / URL (the resume is reachable
only through the permission-checked download view), or any cross-application data
about the candidate (no list of their other applications).
"""

from __future__ import annotations

from rest_framework import serializers

from .models import Application
from .serializers import ApplicationAnswerSerializer, StatusHistorySerializer


class _EmployerJobMiniSerializer(serializers.Serializer):
    """Minimal owned-job context for an applicant row."""

    id = serializers.UUIDField()
    title = serializers.CharField()
    slug = serializers.CharField()
    status = serializers.CharField()


class _ApplicantProfileSerializer(serializers.Serializer):
    """Review-relevant slice of the applicant's candidate profile.

    Only the fields the employer needs to evaluate the application; no login
    email, no resume path, no other-application data.
    """

    full_name = serializers.CharField()
    phone = serializers.CharField()
    preferred_job_title = serializers.CharField()
    preferred_location = serializers.CharField()
    preferred_employment_type = serializers.CharField()


class EmployerApplicationListSerializer(serializers.ModelSerializer):
    """One applicant row in the employer workspace list/table/kanban."""

    job = _EmployerJobMiniSerializer(read_only=True)
    candidate_name = serializers.CharField(source="candidate.full_name", read_only=True)
    candidate_title = serializers.CharField(source="candidate.preferred_job_title", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    has_resume_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "job",
            "candidate_name",
            "candidate_title",
            "status",
            "status_display",
            "has_resume_snapshot",
            "submitted_at",
            "updated_at",
        ]

    def get_has_resume_snapshot(self, application) -> bool:
        return bool(application.resume_file_snapshot)


class EmployerApplicationDetailSerializer(serializers.ModelSerializer):
    """Full applicant detail for an owned-job application.

    Includes ``employer_private_notes`` (employer-only) and the candidate profile
    summary, screening answers, cover letter, current status, and full history.
    """

    job = _EmployerJobMiniSerializer(read_only=True)
    candidate = _ApplicantProfileSerializer(read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    answers = ApplicationAnswerSerializer(many=True, read_only=True)
    status_history = StatusHistorySerializer(many=True, read_only=True)
    has_resume_snapshot = serializers.SerializerMethodField()

    class Meta:
        model = Application
        fields = [
            "id",
            "job",
            "candidate",
            "status",
            "status_display",
            "cover_letter",
            "answers",
            "status_history",
            "employer_private_notes",
            "has_resume_snapshot",
            "resume_snapshot_name",
            "submitted_at",
            "updated_at",
        ]

    def get_has_resume_snapshot(self, application) -> bool:
        return bool(application.resume_file_snapshot)


class StatusChangeInputSerializer(serializers.Serializer):
    """Validated input for PATCH .../status/."""

    status = serializers.CharField()
    change_note = serializers.CharField(required=False, allow_blank=True, default="")


class NotesInputSerializer(serializers.Serializer):
    """Validated input for PATCH .../notes/."""

    employer_private_notes = serializers.CharField(allow_blank=True)
