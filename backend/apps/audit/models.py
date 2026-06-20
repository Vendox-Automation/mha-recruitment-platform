"""Audit log model (spec §20.13, AGENTS §13).

``audit`` is a leaf app: it depends on nothing and is written to by other apps
through the thin :func:`apps.audit.services.record_action` service. Rows are an
append-only record of sensitive actions, so the admin registration is read-only
(see ``admin.py``) and there is no update/delete path in application code.

The ``actor`` FK uses ``SET_NULL`` so deleting a user never erases history; the
target is recorded structurally as ``target_type`` + ``target_id`` (a string, so
UUID and integer primary keys both fit) rather than a hard FK, keeping the table
decoupled from every other app's schema.
"""

from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """Append-only record of an audit-sensitive action."""

    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_actions",
        help_text=_("User who performed the action; null if the actor was deleted or the system."),
    )
    action = models.CharField(_("action"), max_length=100)
    target_type = models.CharField(_("target type"), max_length=100, blank=True, default="")
    target_id = models.CharField(_("target id"), max_length=64, blank=True, default="")
    metadata_json = models.JSONField(_("metadata"), default=dict, blank=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)

    class Meta:
        verbose_name = _("audit log")
        verbose_name_plural = _("audit logs")
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["target_type", "target_id"]),
            models.Index(fields=["action"]),
            models.Index(fields=["-created_at"]),
        ]

    def __str__(self) -> str:
        actor = self.actor_id or "system"
        return f"{self.action} by {actor} on {self.target_type}:{self.target_id}"
