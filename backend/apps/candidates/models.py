"""Candidate profile model (spec §20.2).

The full documented schema is defined now so later phases add behaviour and UI,
not columns. The OneToOne points at ``settings.AUTH_USER_MODEL`` (never a direct
import) to avoid app-load cycles (ADR-0001 §8.3).

Resume bytes are private personal data: the ``resume_file`` FileField is bound to
:data:`apps.candidates.storage.private_resume_storage` (a non-public root) and
stored under a server-generated opaque name (:data:`resume_upload_to`). The field
is NEVER serialised as ``.url`` — the only retrieval path is the
permission-checked download view (ADR-0001 §5, spec §22.2).
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.candidates.storage import private_resume_storage, resume_upload_to


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

    # Resume bytes live in private (non-public) storage under an opaque name.
    # Never expose ``resume_file.url`` — serve via the permission-checked view.
    resume_file = models.FileField(
        _("resume file"),
        upload_to=resume_upload_to,
        storage=private_resume_storage,
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


class SavedJob(models.Model):
    """A job a candidate has bookmarked for later (spec §20.9, §15.5).

    A candidate may save a public job once; the ``UniqueConstraint`` on
    ``(candidate, job)`` makes a repeat save a no-op rather than a duplicate row.
    Saving is independent of the job's lifecycle — an unpublished job stays in the
    list but is flagged unavailable in the API (spec §15.5: label, do not hide).

    The constraint is declared in ``Meta.constraints`` (not added later via an
    ``AddField``/``AlterField`` step) so the portable Postgres migration carries
    no ``_like`` index pitfall (ADR-0001 §6.1).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    candidate = models.ForeignKey(
        CandidateProfile,
        on_delete=models.CASCADE,
        related_name="saved_jobs",
    )
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.CASCADE,
        related_name="saved_by",
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("saved job")
        verbose_name_plural = _("saved jobs")
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["candidate", "job"], name="uniq_saved_job_candidate_job"
            )
        ]
        indexes = [
            models.Index(fields=["candidate", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.candidate_id} saved {self.job_id}"
