"""Read-only admin for job-view telemetry (spec §15.8, AGENTS §13).

``JobViewEvent`` rows are privacy-sensitive telemetry written exclusively by the
recording service. The admin is fully read-only — no add/change/delete — so the
signal cannot be fabricated or edited, and it surfaces only the non-identifying
fields (the salted hash is shown truncated, never a raw identifier or IP, which
are never stored in the first place).
"""

from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest

from apps.analytics.models import JobViewEvent


@admin.register(JobViewEvent)
class JobViewEventAdmin(admin.ModelAdmin):
    list_display = ["viewed_at", "job", "viewer_kind"]
    list_filter = ["viewed_at"]
    search_fields = ["job__title"]
    date_hierarchy = "viewed_at"
    ordering = ["-viewed_at"]
    readonly_fields = ["id", "job", "user", "anonymous_session_hash", "viewed_at"]
    raw_id_fields = ["job", "user"]

    @admin.display(description="Viewer")
    def viewer_kind(self, obj: JobViewEvent) -> str:
        return "authenticated" if obj.user_id else "anonymous"

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: JobViewEvent | None = None) -> bool:
        return False

    def has_delete_permission(self, request: HttpRequest, obj: JobViewEvent | None = None) -> bool:
        return False
