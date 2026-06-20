"""Django admin job moderation (spec §14.11, §22.1; AGENTS §13).

The internal admin surface for moderating jobs. Suspend / close / remove /
mark-supported all route through :mod:`apps.jobs.services.moderation`, which
writes an ``AuditLog`` entry inside the state-change transaction — there is no
admin path that moderates a job without an audit trail. Admins may also create
MHA-owned jobs here: leave ``employer`` blank, set ``source_type`` to
``MHA_DIRECT``, and ``created_by`` is stamped to the acting admin on save.
"""

from __future__ import annotations

from django.contrib import admin, messages
from django.http import HttpRequest

from apps.jobs.models import Job, ScreeningQuestion
from apps.jobs.services import moderation


class ScreeningQuestionInline(admin.TabularInline):
    model = ScreeningQuestion
    extra = 0
    fields = ["display_order", "question", "question_type", "is_required", "options_json"]
    ordering = ["display_order"]


@admin.register(Job)
class JobAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "employer",
        "status",
        "source_type",
        "is_mha_supported",
        "published_at",
        "application_deadline",
        "created_at",
    ]
    list_filter = ["status", "source_type", "is_mha_supported", "employment_type"]
    search_fields = ["title", "location", "employer__company_name"]
    raw_id_fields = ["employer", "created_by"]
    readonly_fields = ["id", "slug", "published_at", "closed_at", "created_at", "updated_at"]
    inlines = [ScreeningQuestionInline]
    actions = [
        "suspend_selected",
        "close_selected",
        "mark_mha_supported",
        "unmark_mha_supported",
        "remove_selected",
    ]

    def save_model(self, request: HttpRequest, obj: Job, form, change) -> None:
        # Stamp the acting admin as creator for MHA-direct jobs created here.
        if not change and obj.created_by_id is None:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    @admin.action(description="Suspend selected jobs (audited)")
    def suspend_selected(self, request: HttpRequest, queryset) -> None:
        count = 0
        for job in queryset:
            moderation.suspend_job(job, actor=request.user)
            count += 1
        self.message_user(request, f"{count} job(s) suspended.", level=messages.SUCCESS)

    @admin.action(description="Close selected jobs (audited)")
    def close_selected(self, request: HttpRequest, queryset) -> None:
        count = 0
        for job in queryset:
            moderation.admin_close_job(job, actor=request.user)
            count += 1
        self.message_user(request, f"{count} job(s) closed.", level=messages.SUCCESS)

    @admin.action(description="Mark selected jobs as MHA supported (audited)")
    def mark_mha_supported(self, request: HttpRequest, queryset) -> None:
        for job in queryset:
            moderation.set_mha_supported(job, actor=request.user, supported=True)
        self.message_user(request, "Marked as MHA supported.", level=messages.SUCCESS)

    @admin.action(description="Unmark MHA supported (audited)")
    def unmark_mha_supported(self, request: HttpRequest, queryset) -> None:
        for job in queryset:
            moderation.set_mha_supported(job, actor=request.user, supported=False)
        self.message_user(request, "Unmarked MHA supported.", level=messages.SUCCESS)

    @admin.action(description="Remove selected jobs (delete, audited)")
    def remove_selected(self, request: HttpRequest, queryset) -> None:
        count = 0
        for job in list(queryset):
            moderation.remove_job(job, actor=request.user)
            count += 1
        self.message_user(request, f"{count} job(s) removed.", level=messages.WARNING)


@admin.register(ScreeningQuestion)
class ScreeningQuestionAdmin(admin.ModelAdmin):
    list_display = ["question", "job", "question_type", "is_required", "display_order"]
    list_filter = ["question_type", "is_required"]
    search_fields = ["question", "job__title"]
    raw_id_fields = ["job"]
