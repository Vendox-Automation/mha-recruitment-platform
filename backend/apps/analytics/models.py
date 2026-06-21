"""JobViewEvent model — privacy-aware public job-view telemetry (spec §20.12).

A row records that *a* viewer opened *a* job's public detail page. The design is
deliberately minimal and privacy-first (AGENTS §13, spec §15.8):

* NO raw IP address, user-agent, or any other PII is ever stored.
* For anonymous viewers we store ``anonymous_session_hash`` — a SALTED one-way
  hash of a per-session identifier (see ``services.recording``), never the raw
  identifier. The salt (``settings.SECRET_KEY``) is not stored alongside the
  hash, so a hash cannot be reversed to recover the session or correlate a
  person across contexts.
* For authenticated viewers we keep a nullable ``user`` FK (SET_NULL) purely to
  de-duplicate their own repeated views; analytics aggregates never expose an
  individual user's activity.

Counts are de-duplicated within a short window per (job, viewer) by the recording
service so a page refresh does not inflate a job's view count — the table stays an
honest, low-resolution signal rather than a precise tracker.

Portability (ADR-0001 §6.1): UUID PK, ``django.db.models`` only.
"""

from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models
from django.utils.translation import gettext_lazy as _


class JobViewEvent(models.Model):
    """One de-duplicated public view of a job (spec §20.12)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.CASCADE,
        related_name="view_events",
    )
    # Set for a signed-in viewer; null for an anonymous one. SET_NULL so deleting
    # a user never erases the aggregate signal, and the row carries no identity.
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="job_view_events",
    )
    # Salted one-way hash of an anonymous session id — NEVER a raw IP / PII.
    # ``null=True`` (not "") distinguishes "no session identifier" from a real
    # empty hash, so the noqa is deliberate.
    anonymous_session_hash = models.CharField(  # noqa: DJ001
        _("anonymous session hash"), max_length=64, null=True, blank=True
    )
    viewed_at = models.DateTimeField(_("viewed at"), auto_now_add=True)

    class Meta:
        verbose_name = _("job view event")
        verbose_name_plural = _("job view events")
        ordering = ["-viewed_at"]
        indexes = [
            models.Index(fields=["job", "-viewed_at"]),
            models.Index(fields=["job", "user", "-viewed_at"]),
            models.Index(fields=["job", "anonymous_session_hash", "-viewed_at"]),
        ]

    def __str__(self) -> str:
        who = f"user {self.user_id}" if self.user_id else "anon"
        return f"view of {self.job_id} by {who}"
