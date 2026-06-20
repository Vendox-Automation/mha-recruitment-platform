"""Audit admin must be read-only to preserve audit integrity (spec §22.1)."""

from __future__ import annotations

import pytest
from django.contrib.admin.sites import AdminSite

from apps.audit.admin import AuditLogAdmin
from apps.audit.models import AuditLog


@pytest.fixture
def audit_admin() -> AuditLogAdmin:
    return AuditLogAdmin(AuditLog, AdminSite())


def test_audit_admin_blocks_add(audit_admin):
    assert audit_admin.has_add_permission(request=None) is False


def test_audit_admin_blocks_change(audit_admin):
    assert audit_admin.has_change_permission(request=None) is False


def test_audit_admin_blocks_delete(audit_admin):
    assert audit_admin.has_delete_permission(request=None) is False


def test_audit_admin_all_fields_readonly(audit_admin):
    expected = {"actor", "action", "target_type", "target_id", "metadata_json", "created_at"}
    assert set(audit_admin.readonly_fields) == expected
