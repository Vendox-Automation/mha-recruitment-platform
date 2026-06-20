"""Read-only admin for the audit log (spec §22.1, AGENTS §13).

Audit integrity depends on the log being append-only: it is written exclusively
through :func:`apps.audit.services.record_action`. The admin therefore disables
add, change, and delete entirely and renders every field read-only, so a staff
user can inspect history but never alter or fabricate it.
"""

from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest

from apps.audit.models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["created_at", "action", "actor", "target_type", "target_id"]
    list_filter = ["action", "target_type", "created_at"]
    search_fields = ["action", "target_type", "target_id", "actor__email"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]

    readonly_fields = ["actor", "action", "target_type", "target_id", "metadata_json", "created_at"]

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: AuditLog | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: AuditLog | None = None) -> bool:
        return False
