"""Support-request admin — the MHA staff career-support workflow (spec §22.1).

Staff triage requests here: read the intake, assign an owner, and move the
status through NEW → IN_PROGRESS → RESOLVED/CLOSED. Every status change is routed
through :func:`apps.support.services.support_service.change_status` so it lands in
the audit log exactly once (the same tamper-evident trail as other sensitive
admin actions); editing other fields does not spuriously emit an audit entry.

The attachment is private: the admin shows only its display name and a link to
the permission-checked download view, never a raw file path or public URL.
"""

from __future__ import annotations

from django.contrib import admin
from django.urls import reverse
from django.utils.html import format_html

from apps.support.models import SupportRequest
from apps.support.services import support_service


@admin.register(SupportRequest)
class SupportRequestAdmin(admin.ModelAdmin):
    list_display = ["created_at", "category", "name", "email", "status", "assigned_to"]
    list_filter = ["status", "category", "created_at"]
    search_fields = ["name", "email", "phone", "message"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    raw_id_fields = ["user", "job", "assigned_to"]
    # Status is changed through the audited service path below, not by free
    # editing of the column, so it (and the requester-supplied content) is
    # read-only in the form; ``assigned_to`` stays editable for triage.
    readonly_fields = [
        "id",
        "user",
        "job",
        "name",
        "email",
        "phone",
        "category",
        "message",
        "attachment_link",
        "created_at",
        "updated_at",
    ]
    fields = [
        "id",
        "user",
        "job",
        "name",
        "email",
        "phone",
        "category",
        "message",
        "attachment_link",
        "status",
        "assigned_to",
        "created_at",
        "updated_at",
    ]
    actions = ["mark_in_progress", "mark_resolved", "mark_closed"]

    @admin.display(description="Attachment")
    def attachment_link(self, obj: SupportRequest) -> str:
        if not obj.has_attachment:
            return "—"
        url = reverse("support:attachment-download", args=[obj.pk])
        return format_html('<a href="{}">{}</a>', url, obj.resume_original_name or "attachment")

    def save_model(self, request, obj, form, change) -> None:
        """Persist edits; route a status change through the audited service.

        On a status transition we delegate to ``change_status`` (one audit entry,
        atomic) instead of a bare ``save`` so the queue's history stays complete.
        ``assigned_to`` edits are saved normally. Non-status edits never emit an
        audit entry.
        """
        if not change:
            obj.save()
            return

        old_status = (
            SupportRequest.objects.filter(pk=obj.pk).values_list("status", flat=True).first()
        )
        if old_status is not None and old_status != obj.status:
            # Revert the in-memory status so the service computes the correct
            # from/to and writes a single audit row; assignment is applied too.
            new_status = obj.status
            obj.status = old_status
            support_service.change_status(
                support_request=obj,
                new_status=new_status,
                actor=request.user,
                assigned_to=obj.assigned_to,
            )
        else:
            obj.save()

    def _bulk_transition(self, request, queryset, new_status: str) -> None:
        count = 0
        for support_request in queryset:
            if support_request.status != new_status:
                support_service.change_status(
                    support_request=support_request,
                    new_status=new_status,
                    actor=request.user,
                )
                count += 1
        self.message_user(request, f"{count} request(s) updated.")

    @admin.action(description="Mark selected as In progress")
    def mark_in_progress(self, request, queryset) -> None:
        self._bulk_transition(request, queryset, "IN_PROGRESS")

    @admin.action(description="Mark selected as Resolved")
    def mark_resolved(self, request, queryset) -> None:
        self._bulk_transition(request, queryset, "RESOLVED")

    @admin.action(description="Mark selected as Closed")
    def mark_closed(self, request, queryset) -> None:
        self._bulk_transition(request, queryset, "CLOSED")
