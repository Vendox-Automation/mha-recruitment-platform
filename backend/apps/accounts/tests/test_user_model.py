"""Smoke tests for the custom user model and manager."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


@pytest.mark.django_db
def test_create_user_defaults_to_active_candidate():
    user = User.objects.create_user(email="Person@Example.com", password="pw-123456")
    # Email is normalised to lowercase (ADR-0001 §6.1.7).
    assert user.email == "person@example.com"
    assert user.role == User.Role.CANDIDATE
    assert user.status == User.Status.ACTIVE
    assert user.is_candidate is True
    assert user.is_staff is False
    assert user.check_password("pw-123456")


@pytest.mark.django_db
def test_create_superuser_is_admin_role():
    admin = User.objects.create_superuser(email="admin@example.com", password="pw-123456")
    assert admin.role == User.Role.ADMIN
    assert admin.is_administrator is True
    assert admin.is_staff is True
    assert admin.is_superuser is True


@pytest.mark.django_db
def test_email_is_required():
    with pytest.raises(ValueError):
        User.objects.create_user(email="", password="pw-123456")


@pytest.mark.django_db
def test_uuid_primary_key_and_unverified_email():
    user = User.objects.create_user(email="uuid@example.com", password="pw-123456")
    assert len(str(user.pk)) == 36  # UUID string form
    assert user.is_email_verified is False
