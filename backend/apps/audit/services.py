"""Thin write-only service for recording audit-sensitive actions (ADR §3.1).

Every app that performs a sensitive action (employer approval, resume access,
admin overrides, ...) calls :func:`record_action` rather than constructing
``AuditLog`` rows directly. Keeping the single write path here means the
target-derivation rules and any future enrichment (request id, ip) live in one
place, and callers stay decoupled from the audit schema.
"""

from __future__ import annotations

from typing import Any

from django.db import models

from apps.audit.models import AuditLog


def record_action(
    *,
    actor: models.Model | None,
    action: str,
    target: models.Model | None = None,
    metadata: dict[str, Any] | None = None,
) -> AuditLog:
    """Record one audit entry.

    ``actor`` is the acting user (or ``None`` for system/anonymous actions).
    ``target`` may be any model instance; its ``target_type`` (the model's
    ``app_label.ModelName``) and ``target_id`` (its primary key, stringified)
    are derived automatically. ``metadata`` holds non-sensitive structured
    context and must be JSON-serialisable.
    """
    target_type = ""
    target_id = ""
    if target is not None:
        target_type = f"{target._meta.app_label}.{target._meta.object_name}"
        target_id = "" if target.pk is None else str(target.pk)

    return AuditLog.objects.create(
        actor=actor,
        action=action,
        target_type=target_type,
        target_id=target_id,
        metadata_json=metadata or {},
    )
