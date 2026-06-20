"""Application, ApplicationAnswer, and ApplicationStatusHistory models.

A candidate applies to a job once (enforced by a DB unique constraint). The
resume used is snapshotted into a private, immutable copy at submission so a
later resume replacement never alters a past application (ADR-0001 §5.5).
``employer_private_notes`` is authoritative employer-only data and is never
serialised to candidates (spec §15.4, §22.1).

Portability (ADR-0001 §6.1): UUID PKs, JSONField from django.db.models,
DecimalField is not needed here, ORM-level UniqueConstraint, no contrib.postgres.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.candidates.storage import private_resume_storage


def snapshot_upload_to(instance: Application, filename: str) -> str:
    """Server-generated, opaque path for the application resume snapshot.

    The client filename is never used for the stored path (path-traversal
    defence); only the validated extension carried over from the candidate's
    resume is preserved for the display/download name.
    """
    suffix = ""
    if "." in filename:
        suffix = "." + filename.rsplit(".", 1)[1].lower()
        if suffix not in {".pdf", ".docx"}:
            suffix = ""
    return f"resume_snapshots/{uuid.uuid4().hex}{suffix}"


class ApplicationStatus(models.TextChoices):
    APPLIED = "APPLIED", _("Applied")
    UNDER_REVIEW = "UNDER_REVIEW", _("Under review")
    SHORTLISTED = "SHORTLISTED", _("Shortlisted")
    INTERVIEW = "INTERVIEW", _("Interview")
    OFFERED = "OFFERED", _("Offered")
    HIRED = "HIRED", _("Hired")
    REJECTED = "REJECTED", _("Rejected")


# Stages counted as positive pipeline progress on the candidate dashboard.
# REJECTED is intentionally excluded (spec §14.9).
POSITIVE_SNAPSHOT_STATUSES = (
    ApplicationStatus.APPLIED,
    ApplicationStatus.UNDER_REVIEW,
    ApplicationStatus.SHORTLISTED,
    ApplicationStatus.INTERVIEW,
    ApplicationStatus.OFFERED,
    ApplicationStatus.HIRED,
)


class Application(models.Model):
    """A candidate's application to a single job (spec §20.6)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey("jobs.Job", on_delete=models.CASCADE, related_name="applications")
    candidate = models.ForeignKey(
        "candidates.CandidateProfile",
        on_delete=models.CASCADE,
        related_name="applications",
    )
    # Immutable private copy of the resume used at submission (ADR-0001 §5.5).
    resume_file_snapshot = models.FileField(
        _("resume snapshot"),
        storage=private_resume_storage,
        upload_to=snapshot_upload_to,
        max_length=255,
    )
    resume_snapshot_name = models.CharField(max_length=255, blank=True, default="")
    cover_letter = models.TextField(_("cover letter"), blank=True, default="")
    status = models.CharField(
        _("status"),
        max_length=20,
        choices=ApplicationStatus.choices,
        default=ApplicationStatus.APPLIED,
    )
    # Employer-only; NEVER serialised to candidates (spec §15.4).
    employer_private_notes = models.TextField(_("employer private notes"), blank=True, default="")
    submitted_at = models.DateTimeField(_("submitted at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("application")
        verbose_name_plural = _("applications")
        ordering = ["-submitted_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["job", "candidate"], name="uniq_application_job_candidate"
            )
        ]

    def __str__(self) -> str:
        return f"{self.candidate_id} → {self.job_id} ({self.status})"


class ApplicationAnswer(models.Model):
    """A candidate's answer to one screening question (spec §20.7)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(Application, on_delete=models.CASCADE, related_name="answers")
    question = models.ForeignKey(
        "jobs.ScreeningQuestion", on_delete=models.CASCADE, related_name="answers"
    )
    answer_text = models.TextField(blank=True, default="")
    answer_json = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["question__display_order"]
        constraints = [
            models.UniqueConstraint(
                fields=["application", "question"], name="uniq_answer_application_question"
            )
        ]

    def __str__(self) -> str:
        return f"answer {self.id} for application {self.application_id}"


class ApplicationStatusHistory(models.Model):
    """An immutable record of one application status change (spec §20.8)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    application = models.ForeignKey(
        Application, on_delete=models.CASCADE, related_name="status_history"
    )
    # null (not "") on the initial submission entry means "no prior status".
    from_status = models.CharField(  # noqa: DJ001
        max_length=20, choices=ApplicationStatus.choices, null=True, blank=True
    )
    to_status = models.CharField(max_length=20, choices=ApplicationStatus.choices)
    changed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="application_status_changes",
    )
    change_note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = _("application status histories")
        ordering = ["created_at"]

    def __str__(self) -> str:
        return f"{self.application_id}: {self.from_status} -> {self.to_status}"
