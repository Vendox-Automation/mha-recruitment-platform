"""Django admin registration for candidate profiles."""

from __future__ import annotations

from django.contrib import admin

from .models import CandidateProfile


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
