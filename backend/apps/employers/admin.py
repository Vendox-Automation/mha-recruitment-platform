"""Django admin registration for employer profiles.

Read/inspect only this phase. The admin approval actions (approve, reject,
suspend) with audit and email land in Phase 3.
"""

from __future__ import annotations

from django.contrib import admin

from .models import EmployerProfile


@admin.register(EmployerProfile)
class EmployerProfileAdmin(admin.ModelAdmin):
    list_display = ["company_name", "user", "approval_status", "contact_person", "created_at"]
    list_filter = ["approval_status", "industry"]
    search_fields = ["company_name", "user__email", "contact_person"]
    readonly_fields = ["id", "created_at", "updated_at", "approved_at", "suspended_at"]
    raw_id_fields = ["user", "approved_by"]
