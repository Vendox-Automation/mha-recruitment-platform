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
