"""Candidate profile model (spec §20.2).

The full documented schema is defined now so later phases add behaviour and UI,
not columns. The OneToOne points at ``settings.AUTH_USER_MODEL`` (never a direct
import) to avoid app-load cycles (ADR-0001 §8.3). Resume behaviour (private
storage backend, validation, parsing) lands in Phase 5; here we only model the
metadata columns.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


def resume_upload_path(instance: CandidateProfile, filename: str) -> str:
    """Server-side resume path keyed by the owner id.

    TODO(Phase 5): a private storage backend + opaque server-side filenames land
    in Phase 5 (ADR-0001 §5). For now the default storage is used and the
    FileField is never exposed via ``.url`` to clients.
    """
    return f"resumes/{instance.user_id}/{filename}"


class CandidateProfile(models.Model):
    """Candidate-specific data attached one-to-one to a ``User``."""

    class ResumeParsingStatus(models.TextChoices):
        NONE = "NONE", _("No resume")
        PENDING = "PENDING", _("Pending")
        PROCESSING = "PROCESSING", _("Processing")
        COMPLETED = "COMPLETED", _("Completed")
        FAILED = "FAILED", _("Failed")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="candidate_profile",
    )

    # Required-capable basic profile fields (spec §20.2). They are blank-capable
    # at the DB level so partial onboarding is possible; required-ness for the
    # basic profile is enforced by serializers per workflow.
    full_name = models.CharField(_("full name"), max_length=150)
    phone = models.CharField(_("phone"), max_length=40)
    preferred_job_title = models.CharField(_("preferred job title"), max_length=150)

    # Optional matching preferences.
    preferred_location = models.CharField(
        _("preferred location"), max_length=150, blank=True, default=""
    )
    preferred_employment_type = models.CharField(
        _("preferred employment type"), max_length=50, blank=True, default=""
    )

    # Resume metadata. Storage default is intentional for now (see module TODO).
    resume_file = models.FileField(
        _("resume file"),
        upload_to=resume_upload_path,
        null=True,
        blank=True,
    )
    resume_original_name = models.CharField(
        _("resume original name"), max_length=255, blank=True, default=""
    )
    resume_uploaded_at = models.DateTimeField(_("resume uploaded at"), null=True, blank=True)
    resume_parsing_status = models.CharField(
        _("resume parsing status"),
        max_length=20,
        choices=ResumeParsingStatus.choices,
        default=ResumeParsingStatus.NONE,
    )
    # Portable JSONField (ADR-0001 §6.1.2); default list of extracted keywords.
    resume_extracted_keywords_json = models.JSONField(
        _("resume extracted keywords"), default=list, blank=True
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("candidate profile")
        verbose_name_plural = _("candidate profiles")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.full_name} <{self.user_id}>"

    @property
    def has_resume(self) -> bool:
        return bool(self.resume_file)

    @property
    def profile_completion(self) -> int:
        """Coarse completion hint (0–100) for dashboard nudges.

        Counts the basic-profile fields plus a resume. Intentionally simple; the
        UI later renders a richer breakdown.
        """
        checks = [
            bool(self.full_name),
            bool(self.phone),
            bool(self.preferred_job_title),
            bool(self.preferred_location),
            self.has_resume,
        ]
        return round(100 * sum(checks) / len(checks))
