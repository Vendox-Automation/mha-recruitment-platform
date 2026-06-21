"""Smart Job Fit result model (spec §20.11).

``JobFitResult`` is the persisted, candidate-facing outcome of a scoring run for a
(candidate, job) pair. Exactly one *current* result exists per pair — enforced by a
``UniqueConstraint(candidate, job)`` (ADR-0001 §6.1.6, ORM-level so both Postgres
and SQLite enforce it) — and it is regenerated on demand when the job, resume, or
preferences change (spec §20.11).

The numeric ``score``/``band`` come solely from the deterministic rule engine
(:mod:`apps.matching.engine`). The optional ``ai_*`` fields record only an AI-
*phrased explanation* plus provider metadata; the AI never alters the score
(spec §16.5). ``generated_at`` is modelled so a future async worker can populate
results out-of-band without a schema change (ADR-0001 §9.3).

Reason lists use portable ``JSONField`` (ADR-0001 §6.1.2 — never contrib.postgres).
"""

from __future__ import annotations

import uuid

from django.db import models
from django.utils.translation import gettext_lazy as _


class JobFitResult(models.Model):
    """One current Smart Job Fit result per (candidate, job)."""

    class Band(models.TextChoices):
        STRONG = "strong", _("Strong match")
        GOOD = "good", _("Good potential match")
        PARTIAL = "partial", _("Partial match")
        LIMITED = "limited", _("Limited match")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    candidate = models.ForeignKey(
        "candidates.CandidateProfile",
        on_delete=models.CASCADE,
        related_name="job_fit_results",
    )
    job = models.ForeignKey(
        "jobs.Job",
        on_delete=models.CASCADE,
        related_name="job_fit_results",
    )

    score = models.PositiveSmallIntegerField(_("score"))
    band = models.CharField(_("band"), max_length=20, choices=Band.choices)

    # Structured candidate-facing reasons (spec §16.4). Portable JSON lists.
    matched_json = models.JSONField(_("matched reasons"), default=list, blank=True)
    gaps_json = models.JSONField(_("gap reasons"), default=list, blank=True)
    unknown_json = models.JSONField(_("unknown reasons"), default=list, blank=True)

    # Version of the rule logic/weights that produced this result.
    rule_version = models.CharField(_("rule version"), max_length=20)

    # AI explanation metadata (spec §16.5/§16.7). ``ai_enabled`` records whether a
    # real AI provider produced ``ai_explanation``; when False the explanation is
    # the deterministic fallback copy. The AI never changes ``score``/``band``.
    ai_enabled = models.BooleanField(_("AI explanation enabled"), default=False)
    ai_provider = models.CharField(_("AI provider"), max_length=100, blank=True, default="")
    ai_model = models.CharField(_("AI model"), max_length=100, blank=True, default="")
    ai_explanation = models.TextField(_("explanation"), blank=True, default="")

    generated_at = models.DateTimeField(_("generated at"), auto_now=True)

    class Meta:
        verbose_name = _("job fit result")
        verbose_name_plural = _("job fit results")
        ordering = ["-generated_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["candidate", "job"],
                name="uniq_jobfit_candidate_job",
            )
        ]

    def __str__(self) -> str:
        return f"JobFit({self.candidate_id} -> {self.job_id}): {self.score} {self.band}"
