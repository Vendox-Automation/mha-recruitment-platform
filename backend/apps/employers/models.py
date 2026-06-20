"""Employer profile model (spec §20.3).

The full documented schema is defined now. Only the ``approval_status`` field
(defaulting PENDING) is wired in this phase; the approval WORKFLOW — admin
actions, audit records, emails, and screens — is Phase 3. The OneToOne points at
``settings.AUTH_USER_MODEL`` to avoid app-load cycles (ADR-0001 §8.3).
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


def logo_upload_path(instance: EmployerProfile, filename: str) -> str:
    return f"employer-logos/{instance.user_id}/{filename}"


class EmployerProfile(models.Model):
    """Employer-specific data attached one-to-one to a ``User``."""

    class ApprovalStatus(models.TextChoices):
        PENDING = "PENDING", _("Pending")
        APPROVED = "APPROVED", _("Approved")
        REJECTED = "REJECTED", _("Rejected")
        SUSPENDED = "SUSPENDED", _("Suspended")

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="employer_profile",
    )

    # Required signup fields (spec §20.3).
    company_name = models.CharField(_("company name"), max_length=200)
    contact_person = models.CharField(_("contact person"), max_length=150)
    phone = models.CharField(_("phone"), max_length=40)

    # Approval lifecycle. Only the status default is meaningful this phase; the
    # workflow that sets the rest lands in Phase 3.
    approval_status = models.CharField(
        _("approval status"),
        max_length=20,
        choices=ApprovalStatus.choices,
        default=ApprovalStatus.PENDING,
    )
    approval_reason = models.TextField(_("approval reason"), blank=True, default="")
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="employer_approvals",
    )
    approved_at = models.DateTimeField(_("approved at"), null=True, blank=True)
    suspended_at = models.DateTimeField(_("suspended at"), null=True, blank=True)

    # Optional public company fields (completed later).
    logo = models.FileField(_("logo"), upload_to=logo_upload_path, null=True, blank=True)
    company_summary = models.TextField(_("company summary"), blank=True, default="")
    website = models.URLField(_("website"), blank=True, default="")
    industry = models.CharField(_("industry"), max_length=120, blank=True, default="")
    company_size = models.CharField(_("company size"), max_length=60, blank=True, default="")
    company_location = models.CharField(
        _("company location"), max_length=150, blank=True, default=""
    )
    culture_text = models.TextField(_("culture"), blank=True, default="")
    benefits_text = models.TextField(_("benefits"), blank=True, default="")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _("employer profile")
        verbose_name_plural = _("employer profiles")
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.company_name} <{self.user_id}>"

    @property
    def is_approved(self) -> bool:
        return self.approval_status == self.ApprovalStatus.APPROVED
