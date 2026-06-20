"""Security-hardening tests for the user model (from the Phase 2 review)."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction

User = get_user_model()


@pytest.mark.django_db
def test_deactivated_status_sets_is_active_false():
    user = User.objects.create_user(
        email="dead@example.com", password="pw-123456", status=User.Status.DEACTIVATED
    )
    # Auth backend + session loader reject globally, not only on status-aware views.
    assert user.is_active is False


@pytest.mark.django_db
def test_suspended_status_remains_active():
    user = User.objects.create_user(email="susp@example.com", password="pw-123456")
    user.status = User.Status.SUSPENDED
    user.save()
    user.refresh_from_db()
    # Suspended users can still sign in to a restricted screen (spec §8.5).
    assert user.is_active is True


@pytest.mark.django_db
def test_db_enforces_case_insensitive_email_uniqueness():
    User.objects.create_user(email="dup@example.com", password="pw-123456")
    # bulk_create bypasses Model.save() normalisation; the DB-level constraint
    # must still reject a casing-variant duplicate.
    with pytest.raises(IntegrityError), transaction.atomic():
        User.objects.bulk_create(
            [User(email="DUP@example.com", role=User.Role.CANDIDATE, status=User.Status.ACTIVE)]
        )
