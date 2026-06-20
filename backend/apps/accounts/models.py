"""Custom user model.

Email is the account identifier. The model is intentionally created before the
first migration so ``AUTH_USER_MODEL`` is locked from the start (ADR-0001 §8,
spec §19.3). Role-specific data lives in profile models owned by the
``candidates`` and ``employers`` apps.
"""

from __future__ import annotations

import uuid

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.db.models.functions import Lower
from django.utils import timezone
from django.utils.translation import gettext_lazy as _

from .managers import UserManager


class User(AbstractBaseUser, PermissionsMixin):
    class Role(models.TextChoices):
        CANDIDATE = "CANDIDATE", _("Candidate")
        EMPLOYER = "EMPLOYER", _("Employer")
        ADMIN = "ADMIN", _("Administrator")

    class Status(models.TextChoices):
        ACTIVE = "ACTIVE", _("Active")
        PENDING = "PENDING", _("Pending")
        SUSPENDED = "SUSPENDED", _("Suspended")
        DEACTIVATED = "DEACTIVATED", _("Deactivated")

    class Locale(models.TextChoices):
        EN = "en", _("English")
        ZH_CN = "zh-CN", _("Simplified Chinese")

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(_("email address"), unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.CANDIDATE)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    preferred_locale = models.CharField(max_length=10, choices=Locale.choices, default=Locale.EN)
    email_verified_at = models.DateTimeField(null=True, blank=True)

    # Django admin / auth flags.
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS: list[str] = []

    class Meta:
        verbose_name = _("user")
        verbose_name_plural = _("users")
        ordering = ["-created_at"]
        constraints = [
            # Authoritative case-insensitive email uniqueness at the database
            # level so bulk inserts / raw writes / concurrent registrations
            # cannot create casing-variant duplicates (security review B2;
            # portable across PostgreSQL and SQLite 3.9+, ADR-0001 §6.1).
            models.UniqueConstraint(Lower("email"), name="uniq_user_email_ci"),
        ]

    def __str__(self) -> str:
        return self.email

    def save(self, *args, **kwargs):
        # Email uniqueness is enforced case-insensitively by normalising on save
        # rather than relying on database collation (ADR-0001 §6.1.7).
        if self.email:
            self.email = self.email.strip().lower()
        # Account status is the lifecycle source of truth. Keep Django's
        # is_active in sync so the auth backend and session loader reject a
        # DEACTIVATED user globally — not only on endpoints that use the custom
        # status permission (security review priority finding). SUSPENDED users
        # remain is_active=True so they can sign in to a restricted screen.
        self.is_active = self.status != self.Status.DEACTIVATED
        super().save(*args, **kwargs)

    @property
    def is_candidate(self) -> bool:
        return self.role == self.Role.CANDIDATE

    @property
    def is_employer(self) -> bool:
        return self.role == self.Role.EMPLOYER

    @property
    def is_administrator(self) -> bool:
        return self.role == self.Role.ADMIN

    @property
    def is_email_verified(self) -> bool:
        return self.email_verified_at is not None
