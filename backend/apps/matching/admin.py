"""Read-only admin for Job Fit results (operational visibility, spec §22.1).

Results are produced by the scoring service, never hand-edited, so the admin is
registered strictly read-only (no add / change / delete) — consistent with the
append-only audit posture and to keep the score authoritative to the rule engine.
"""

from __future__ import annotations

from django.contrib import admin

from apps.matching.models import JobFitResult


@admin.register(JobFitResult)
class JobFitResultAdmin(admin.ModelAdmin):
    list_display = [
        "candidate",
        "job",
        "score",
        "band",
        "ai_enabled",
        "rule_version",
        "generated_at",
    ]
    list_filter = ["band", "ai_enabled", "rule_version"]
    search_fields = ["candidate__full_name", "candidate__user__email", "job__title"]
    readonly_fields = [
        "id",
        "candidate",
        "job",
        "score",
        "band",
        "matched_json",
        "gaps_json",
        "unknown_json",
        "rule_version",
        "ai_enabled",
        "ai_provider",
        "ai_model",
        "ai_explanation",
        "generated_at",
    ]
    raw_id_fields = ["candidate", "job"]

    def has_add_permission(self, request) -> bool:
        return False

    def has_change_permission(self, request, obj=None) -> bool:
        return False

    def has_delete_permission(self, request, obj=None) -> bool:
        return False
