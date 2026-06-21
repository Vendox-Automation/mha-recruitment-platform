"""Job and ScreeningQuestion models (spec §20.4, §20.5).

Django owns the job lifecycle and visibility rules. The public-facing surface of
a job is gated entirely by :meth:`JobQuerySet.public` so that draft / suspended /
closed / expired / archived jobs can never leak through a public endpoint.

Portability (ADR-0001 §6.1): UUID primary keys, ``DecimalField`` for money,
``django.db.models.JSONField`` for screening options, ORM-level ``UniqueConstraint``
for the slug, and no ``django.contrib.postgres`` features (search is portable
``icontains``/``Q`` filtering in the selectors module).
"""

from __future__ import annotations

import secrets
import uuid

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.utils.text import slugify
from django.utils.translation import gettext_lazy as _

# Statuses that must never appear on a public endpoint. PUBLISHED is the only
# publicly visible status, and even then only when the deadline has not passed
# (see ``JobQuerySet.public``).
NON_PUBLIC_STATUSES = (
    "DRAFT",
    "CLOSED",
    "SUSPENDED",
    "EXPIRED",
    "ARCHIVED",
)


class JobQuerySet(models.QuerySet):
    """Reusable scoped queries for jobs."""

    def public(self):
        """Jobs visible on public endpoints (spec §15.3).

        A job is public iff it is PUBLISHED, its deadline has not passed, AND
        its owning employer is APPROVED (or it is an MHA-owned job with no
        employer). Every other status (DRAFT/CLOSED/SUSPENDED/EXPIRED/ARCHIVED)
        is excluded. The deadline check makes an expired-by-date job invisible
        even if a background job has not yet flipped its status to EXPIRED.

        The employer-approval gate ensures that suspending or rejecting an
        employer immediately removes their published jobs from public search
        and detail — moderation has no public footprint left behind
        (security review B1). "APPROVED" is the EmployerProfile approval-status
        value; a null employer denotes an MHA-direct job.
        """
        today = timezone.localdate()
        return (
            self.filter(status=Job.Status.PUBLISHED)
            .filter(
                models.Q(application_deadline__isnull=True)
                | models.Q(application_deadline__gte=today)
            )
            .filter(
                models.Q(employer__isnull=True) | models.Q(employer__approval_status="APPROVED")
            )
        )

    def for_employer(self, employer):
        """All jobs owned by a given employer profile (any status)."""
        return self.filter(employer=employer)


class JobManager(models.Manager.from_queryset(JobQuerySet)):
    """Default manager exposing the queryset selectors."""


def _slug_suffix() -> str:
    """Short, non-guessable suffix appended to the title slug.

    Keeps slugs non-enumerable (a sequential id is never exposed) and avoids
    collisions between identical titles without a retry loop.
    """
    return secrets.token_hex(4)


class Job(models.Model):
    """A job listing (spec §20.4)."""

    class SourceType(models.TextChoices):
        MHA_DIRECT = "MHA_DIRECT", _("MHA direct")
        EMPLOYER_PARTNER = "EMPLOYER_PARTNER", _("Employer partner")
        # Future-ready only; no referral/payment logic in the MVP (spec §20.4).
        AFFILIATE_REFERRAL = "AFFILIATE_REFERRAL", _("Affiliate referral")

    class EmploymentType(models.TextChoices):
        FULL_TIME = "FULL_TIME", _("Full time")
        PART_TIME = "PART_TIME", _("Part time")
        CONTRACT = "CONTRACT", _("Contract")
        INTERNSHIP = "INTERNSHIP", _("Internship")
        TEMPORARY = "TEMPORARY", _("Temporary")

    class SalaryPeriod(models.TextChoices):
        HOURLY = "HOURLY", _("Per hour")
        DAILY = "DAILY", _("Per day")
        MONTHLY = "MONTHLY", _("Per month")
        YEARLY = "YEARLY", _("Per year")

    class ListingLanguage(models.TextChoices):
        EN = "en", _("English")
        ZH_CN = "zh-CN", _("Simplified Chinese")

    class Status(models.TextChoices):
        DRAFT = "DRAFT", _("Draft")
        PUBLISHED = "PUBLISHED", _("Published")
        CLOSED = "CLOSED", _("Closed")
        SUSPENDED = "SUSPENDED", _("Suspended")
        EXPIRED = "EXPIRED", _("Expired")
        ARCHIVED = "ARCHIVED", _("Archived")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    slug = models.SlugField(_("slug"), max_length=255, unique=True, editable=False)

    # ``employer`` is null for MHA-direct listings; ``created_by`` is always set.
    employer = models.ForeignKey(
        "employers.EmployerProfile",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="jobs",
    )
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_jobs",
    )
    source_type = models.CharField(
        _("source type"),
        max_length=20,
        choices=SourceType.choices,
        default=SourceType.EMPLOYER_PARTNER,
    )

    title = models.CharField(_("title"), max_length=200)
    location = models.CharField(_("location"), max_length=200, blank=True, default="")
    employment_type = models.CharField(
        _("employment type"),
        max_length=20,
        choices=EmploymentType.choices,
        default=EmploymentType.FULL_TIME,
    )

    # Salary is portable Decimal money (ADR-0001 §6.1.4). Both bounds nullable;
    # ``salary_disclosed`` lets an employer publish without revealing figures.
    salary_min = models.DecimalField(
        _("salary minimum"), max_digits=12, decimal_places=2, null=True, blank=True
    )
    salary_max = models.DecimalField(
        _("salary maximum"), max_digits=12, decimal_places=2, null=True, blank=True
    )
    salary_currency = models.CharField(_("salary currency"), max_length=3, default="MYR")
    salary_period = models.CharField(
        _("salary period"),
        max_length=10,
        choices=SalaryPeriod.choices,
        default=SalaryPeriod.MONTHLY,
    )
    salary_disclosed = models.BooleanField(_("salary disclosed"), default=False)

    description = models.TextField(_("description"), blank=True, default="")
    requirements = models.TextField(_("requirements"), blank=True, default="")
    application_deadline = models.DateField(_("application deadline"), null=True, blank=True)

    # The language the employer authored the listing in; it is NOT
    # machine-translated (ADR-0001 §7.3, spec §14).
    listing_language = models.CharField(
        _("listing language"),
        max_length=10,
        choices=ListingLanguage.choices,
        default=ListingLanguage.EN,
    )

    status = models.CharField(
        _("status"), max_length=20, choices=Status.choices, default=Status.DRAFT
    )
    is_mha_supported = models.BooleanField(_("MHA supported"), default=False)
    # Admin-facing moderation note (e.g. suspension reason); not employer-writable.
    moderation_reason = models.TextField(_("moderation reason"), blank=True, default="")

    published_at = models.DateTimeField(_("published at"), null=True, blank=True)
    closed_at = models.DateTimeField(_("closed at"), null=True, blank=True)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    objects = JobManager()

    class Meta:
        verbose_name = _("job")
        verbose_name_plural = _("jobs")
        ordering = ["-published_at", "-created_at"]
        indexes = [
            models.Index(fields=["status", "-published_at"]),
            models.Index(fields=["employer", "status"]),
            models.Index(fields=["employment_type"]),
            models.Index(fields=["application_deadline"]),
        ]

    def __str__(self) -> str:
        return f"{self.title} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.title)[:200] or "job"
            self.slug = f"{base}-{_slug_suffix()}"
        super().save(*args, **kwargs)

    @property
    def is_mha_owned(self) -> bool:
        """True for MHA-direct listings (no employer profile attached)."""
        return self.employer_id is None


class ScreeningQuestion(models.Model):
    """A screening question attached to a job (spec §20.5)."""

    class QuestionType(models.TextChoices):
        SHORT_TEXT = "SHORT_TEXT", _("Short text")
        LONG_TEXT = "LONG_TEXT", _("Long text")
        YES_NO = "YES_NO", _("Yes / No")
        SINGLE_CHOICE = "SINGLE_CHOICE", _("Single choice")
        NUMBER = "NUMBER", _("Number")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey(
        Job,
        on_delete=models.CASCADE,
        related_name="screening_questions",
    )
    question = models.CharField(_("question"), max_length=500)
    question_type = models.CharField(
        _("question type"),
        max_length=20,
        choices=QuestionType.choices,
        default=QuestionType.SHORT_TEXT,
    )
    is_required = models.BooleanField(_("required"), default=True)
    # Choice options for SINGLE_CHOICE; a portable JSON list (ADR-0001 §6.1.2).
    options_json = models.JSONField(_("options"), default=list, blank=True)
    display_order = models.PositiveIntegerField(_("display order"), default=0)
    created_at = models.DateTimeField(_("created at"), auto_now_add=True)
    updated_at = models.DateTimeField(_("updated at"), auto_now=True)

    class Meta:
        verbose_name = _("screening question")
        verbose_name_plural = _("screening questions")
        ordering = ["display_order", "created_at"]
        indexes = [
            models.Index(fields=["job", "display_order"]),
        ]

    def __str__(self) -> str:
        return f"{self.question[:50]} ({self.question_type})"
