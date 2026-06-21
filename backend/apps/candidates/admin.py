"""Django admin registration for candidate profiles."""

from __future__ import annotations

from django.contrib import admin
from django.http import HttpRequest

from .models import CandidateProfile, SavedJob


@admin.register(CandidateProfile)
class CandidateProfileAdmin(admin.ModelAdmin):
    list_display = [
        "full_name",
        "user",
        "preferred_job_title",
        "resume_parsing_status",
        "created_at",
    ]
    list_filter = ["resume_parsing_status", "preferred_employment_type"]
    search_fields = ["full_name", "user__email", "preferred_job_title"]
    readonly_fields = ["id", "created_at", "updated_at", "resume_uploaded_at"]
    raw_id_fields = ["user"]


@admin.register(SavedJob)
class SavedJobAdmin(admin.ModelAdmin):
    """Read-only view of candidate bookmarks.

    Saved jobs are candidate-owned activity; staff may inspect them for support
    but never create or edit them (the only write path is the candidate API).
    """

    list_display = ["candidate", "job", "created_at"]
    search_fields = ["candidate__full_name", "candidate__user__email", "job__title"]
    raw_id_fields = ["candidate", "job"]
    readonly_fields = ["id", "candidate", "job", "created_at"]
    date_hierarchy = "created_at"

    def has_add_permission(self, request: HttpRequest) -> bool:
        return False

    def has_change_permission(self, request: HttpRequest, obj: SavedJob | None = None) -> bool:
        return False
