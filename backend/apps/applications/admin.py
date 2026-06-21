"""Admin for operational visibility of applications (spec §14.13).

Read-mostly: applications are created and progressed through the API/employer
workspace, not hand-edited here. Status history is shown inline and is
append-only. ``employer_private_notes`` is visible to administrators only.
"""

from __future__ import annotations

from django.contrib import admin

from .models import Application, ApplicationAnswer, ApplicationStatusHistory


class StatusHistoryInline(admin.TabularInline):
    model = ApplicationStatusHistory
    extra = 0
    can_delete = False
    readonly_fields = ["from_status", "to_status", "changed_by", "change_note", "created_at"]

    def has_add_permission(self, request, obj=None):
        return False


class AnswerInline(admin.TabularInline):
    model = ApplicationAnswer
    extra = 0
    can_delete = False
    readonly_fields = ["question", "answer_text", "answer_json", "created_at"]

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ["id", "job", "candidate", "status", "submitted_at", "updated_at"]
    list_filter = ["status", "submitted_at"]
    search_fields = ["job__title", "candidate__full_name", "candidate__user__email"]
    readonly_fields = [
        "id",
        "job",
        "candidate",
        "resume_file_snapshot",
        "submitted_at",
        "updated_at",
    ]
    inlines = [AnswerInline, StatusHistoryInline]
