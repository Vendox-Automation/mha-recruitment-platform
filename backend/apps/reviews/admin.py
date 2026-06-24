"""Company-review admin (reactive moderation surface).

Reviews are public UGC that publish immediately; moderation is reactive. Staff
can read reviews/replies here and delete them when needed. Deletions in the
in-app admin API go through the audited ``reviews.services`` path; the Django
admin delete is a manual backstop. The reviewer's email is shown to staff (they
may see it) but is never exposed on any public surface.
"""

from __future__ import annotations

from django.contrib import admin

from apps.reviews.models import CompanyReview, EmployerReply


class EmployerReplyInline(admin.StackedInline):
    model = EmployerReply
    extra = 0
    readonly_fields = ["author", "created_at", "updated_at"]


@admin.register(CompanyReview)
class CompanyReviewAdmin(admin.ModelAdmin):
    list_display = ["created_at", "employer", "reviewer_name", "rating", "title"]
    list_filter = ["rating", "created_at"]
    search_fields = ["reviewer_name", "reviewer_email", "title", "body"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    raw_id_fields = ["employer"]
    readonly_fields = ["created_at"]
    inlines = [EmployerReplyInline]


@admin.register(EmployerReply)
class EmployerReplyAdmin(admin.ModelAdmin):
    list_display = ["created_at", "review", "author"]
    search_fields = ["body"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]
    raw_id_fields = ["review", "author"]
    readonly_fields = ["created_at", "updated_at"]
