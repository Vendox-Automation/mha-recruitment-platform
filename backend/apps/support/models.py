"""SupportRequest model — the career-support intake record (spec §20.10, §14.5).

A support request can be raised by a guest OR an authenticated candidate. When
the requester is signed in, ``user`` is linked so they can review their own
history; a guest leaves ``user`` null and is reachable only via ``email``/``phone``.

The optional ``resume_file`` attachment is PRIVATE personal data: it is bound to
the shared private storage backend (``base_url=None``, non-public root) under a
server-generated opaque name, so it has NO public URL. It is validated exactly
like a candidate resume (extension allowlist + magic-byte sniff) before storage
and is served only through a permission-checked admin/owner view
(ADR-0001 §5, spec §22.2).

Workflow state (``status`` + ``assigned_to``) is managed by MHA staff in the
Django admin; each status change is recorded to the audit log via the support
service (spec §22.1).

Portability (ADR-0001 §6.1): UUID PK, ``django.db.models`` only, no
``contrib.postgres``; the status default is a plain column default (no ``_like``
index migration pitfall).
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _

from apps.candidates.storage import private_resume_storage
from apps.support.storage import support_attachment_upload_to


class SupportCategory(models.TextChoices):
    JOB_APPLICATION = "JOB_APPLICATION", _("Job application help")
    RESUME = "RESUME", _("Resume help")
    CAREER_DIRECTION = "CAREER_DIRECTION", _("Career direction")
    APPLICATION_STATUS = "APPLICATION_STATUS", _("Application status")
    OTHER = "OTHER", _("Other")


class SupportStatus(models.TextChoices):
    NEW = "NEW", _("New")
    IN_PROGRESS = "IN_PROGRESS", _("In progress")
    RESOLVED = "RESOLVED", _("Resolved")
    CLOSED = "CLOSED", _("Closed")


class SupportRequest(models.Model):
    """A career-support request (spec §20.10)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Linked when the requester is authenticated; null for guests. SET_NULL keeps
    # the support history intact even if the account is later removed.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_requests",
    )
    # Optional job context (e.g. "I need help applying to this role").
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="support_requests",
    )

    # Contact details — always captured so a guest is reachable.
    name = models.CharField(_("name"), max_length=150)
    email = models.EmailField(_("email"))
    phone = models.CharField(_("phone"), max_length=40, blank=True, default="")

    category = models.CharField(
        _("category"),
        max_length=30,
        choices=SupportCategory.choices,
        default=SupportCategory.OTHER,
    )
    message = models.TextField(_("message"))

    # Optional PRIVATE attachment (no public URL); validated like a resume.
    resume_file = models.FileField(
        _("attachment"),
        upload_to=support_attachment_upload_to,
        storage=private_resume_storage,
        null=True,
        blank=True,
    )
    resume_original_name = models.CharField(
        _("attachment original name"), max_length=255, blank=True, default=""
    )

    status = models.CharField(
        _("status"),
        max_length=20,
        choices=SupportStatus.choices,
        default=SupportStatus.NEW,
    )
    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_support_requests",
    )

    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("support request")
        verbose_name_plural = _("support requests")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "-created_at"]),
            models.Index(fields=["user", "-created_at"]),
        ]

    def __str__(self) -> str:
        return f"{self.category} from {self.email} ({self.status})"

    @property
    def has_attachment(self) -> bool:
        return bool(self.resume_file)
