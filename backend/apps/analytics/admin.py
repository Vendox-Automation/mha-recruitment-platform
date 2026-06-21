"""Analytics admin (spec §13.5, §15.8, AGENTS §13).

Two surfaces with deliberately opposite permissions:

* :class:`MarketInsightAdmin` — FULL CRUD. This is the administrator-managed
  source of curated "MHA insight" content the Career Intelligence Console shows.
  An MHA administrator authors and publishes these cards here.
* :class:`JobViewEventAdmin` — fully READ-ONLY. ``JobViewEvent`` rows are
  privacy-sensitive telemetry written exclusively by the recording service, so
  the signal cannot be fabricated or edited; it surfaces only non-identifying
  fields (the salted hash is shown truncated, never a raw identifier or IP).
"""

from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest

from apps.analytics.models import JobViewEvent, MarketInsight


@admin.register(MarketInsight)
class MarketInsightAdmin(admin.ModelAdmin):
    """Full management of curated MHA insight content (spec §13.5)."""

    list_display = ["title", "category", "display_order", "is_published", "updated_at"]
    list_filter = ["is_published", "category"]
    list_editable = ["display_order", "is_published"]
    search_fields = ["title", "body"]
    ordering = ["display_order", "-created_at"]
    readonly_fields = ["id", "created_at", "updated_at"]
    fields = [
        "id",
        "title",
        "body",
        "category",
        "display_order",
        "is_published",
        "created_at",
        "updated_at",
    ]


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
