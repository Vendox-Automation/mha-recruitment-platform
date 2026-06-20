"""Audit service + model tests (spec §20.13, §22.1)."""

from __future__ import annotations

import pytest
from django.contrib.auth import get_user_model

from apps.audit.models import AuditLog
from apps.audit.services import record_action

User = get_user_model()
PASSWORD = "Synthetic-Pass-9182"


@pytest.mark.django_db
def test_record_action_derives_target_type_and_id():
    actor = User.objects.create_user(email="actor@example.com", password=PASSWORD)
    target = User.objects.create_user(email="target@example.com", password=PASSWORD)

    entry = record_action(
        actor=actor,
        action="test.action",
        target=target,
        metadata={"note": "synthetic"},
    )

    assert entry.actor == actor
    assert entry.action == "test.action"
    assert entry.target_type == "accounts.User"
    assert entry.target_id == str(target.pk)
    assert entry.metadata_json == {"note": "synthetic"}
    assert entry.created_at is not None


@pytest.mark.django_db
def test_record_action_allows_null_actor_and_no_target():
    entry = record_action(actor=None, action="system.event")

    assert entry.actor is None
    assert entry.target_type == ""
    assert entry.target_id == ""
    assert entry.metadata_json == {}


@pytest.mark.django_db
def test_actor_set_null_on_user_delete_preserves_log():
    actor = User.objects.create_user(email="gone@example.com", password=PASSWORD)
    entry = record_action(actor=actor, action="will.persist")

    actor.delete()
    entry.refresh_from_db()

    assert AuditLog.objects.filter(pk=entry.pk).exists()
    assert entry.actor is None
    assert entry.action == "will.persist"
