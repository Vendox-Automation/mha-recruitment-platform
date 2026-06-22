"""Admin employer-approval serializers (scope addition: API-backed admin UI).

These are read-only projections of ``EmployerProfile`` for the administrator
console plus a tiny write serializer for the rejection reason. The approval
lifecycle itself is NEVER mutated through a serializer — every transition runs
through ``apps.employers.services.approval_service`` so the audit + email +
status-sync invariants hold. Explicit fields only (never ``__all__``).
"""

from __future__ import annotations

from rest_framework import serializers

from apps.employers.models import EmployerProfile
from apps.reviews.models import CompanyReview


class EmployerListItemSerializer(serializers.ModelSerializer):
    """Compact employer row for the admin approvals queue."""

    email = serializers.EmailField(source="user.email", read_only=True)

    class Meta:
        model = EmployerProfile
        fields = [
            "id",
            "company_name",
            "contact_person",
            "email",
            "approval_status",
            "industry",
            "company_location",
            "created_at",
            "approved_at",
            "suspended_at",
        ]
        read_only_fields = fields


class EmployerDetailSerializer(EmployerListItemSerializer):
    """List fields plus the extra context an admin needs on the detail screen."""

    approved_by_email = serializers.EmailField(
        source="approved_by.email", read_only=True, allow_null=True
    )

    class Meta(EmployerListItemSerializer.Meta):
        fields = [
            *EmployerListItemSerializer.Meta.fields,
            "approval_reason",
            "approved_by_email",
            "website",
            "company_summary",
            "company_size",
        ]
        read_only_fields = fields


class SummarySerializer(serializers.Serializer):
    """Employer-state counts for the admin dashboard summary card."""

    pending_employers = serializers.IntegerField()
    approved_employers = serializers.IntegerField()
    suspended_employers = serializers.IntegerField()
    rejected_employers = serializers.IntegerField()
    total_employers = serializers.IntegerField()


class AdminReviewSerializer(serializers.ModelSerializer):
    """Admin row for the review-moderation queue.

    Unlike the public review serializer, this DOES expose ``reviewer_email`` —
    administrators may see it for moderation/contact. ``has_reply`` is annotated
    on the queryset so the list never N+1s.
    """

    company_name = serializers.CharField(source="employer.company_name", read_only=True)
    company_slug = serializers.CharField(source="employer.slug", read_only=True)
    has_reply = serializers.BooleanField(read_only=True)

    class Meta:
        model = CompanyReview
        fields = [
            "id",
            "company_name",
            "company_slug",
            "reviewer_name",
            "reviewer_email",
            "rating",
            "title",
            "body",
            "created_at",
            "has_reply",
        ]
        read_only_fields = fields


class RejectSerializer(serializers.Serializer):
    """Body for the reject action: a required, non-empty rejection reason."""

    reason = serializers.CharField(
        allow_blank=False,
        trim_whitespace=True,
        error_messages={
            "blank": "A rejection reason is required.",
            "required": "A rejection reason is required.",
        },
    )
