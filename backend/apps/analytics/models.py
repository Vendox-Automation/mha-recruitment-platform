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


class MarketInsight(models.Model):
    """Administrator-curated "MHA insight" content (spec §13.5, §15.8).

    This is the *honest* source for the Career Intelligence Console's editorial
    "MHA insight" cards: short, human-written hiring observations curated by an
    MHA administrator through Django admin. It is deliberately separate from the
    computed *platform analytics* aggregates (``selectors.public_insights``) so
    the two are never conflated (AGENTS §13 — distinguish "MHA insight" from
    "platform analytics"; never fabricate).

    Integrity guarantees:

    * Nothing is invented by the system — every card is a real row an admin wrote.
    * Only ``is_published`` rows are surfaced publicly; the honest default for a
      fresh install is an EMPTY list until an administrator adds content.

    Portability (ADR-0001 §6.1): UUID PK, ``django.db.models`` only, ordering via
    ``Meta.ordering`` (no per-field ``db_index`` so the migration is a single
    ``CreateModel`` with constraints inline — avoiding the ``*_like`` Postgres
    pattern-index pitfall, §6.1).
    """

    class Category(models.TextChoices):
        ROLES_IN_FOCUS = "roles_in_focus", _("Roles in focus")
        HIRING_OUTLOOK = "hiring_outlook", _("Hiring outlook")
        SKILLS = "skills", _("Skills")
        SALARY_GUIDANCE = "salary_guidance", _("Salary guidance")
        OTHER = "other", _("Other")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(_("title"), max_length=200)
    body = models.TextField(_("body"))
    category = models.CharField(
        _("category"),
        max_length=32,
        choices=Category.choices,
        default=Category.OTHER,
    )
    display_order = models.PositiveIntegerField(
        _("display order"),
        default=0,
        help_text=_("Lower numbers appear first in the public list."),
    )
    is_published = models.BooleanField(
        _("published"),
        default=False,
        help_text=_("Only published insights are shown publicly."),
    )
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("market insight")
        verbose_name_plural = _("market insights")
        ordering = ["display_order", "-created_at"]

    def __str__(self) -> str:
        return self.title


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
