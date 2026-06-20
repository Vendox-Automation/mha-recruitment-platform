"""Employer profile serializers (spec §21.3, §22.1).

Explicit fields only (never ``__all__``). The approval lifecycle fields
(``approval_status``, ``approved_by``, ``approved_at``, ``suspended_at``,
``approval_reason``) are authoritative server state and are NEVER client-settable
— they are either read-only or absent from the writable serializer entirely, so a
malicious PATCH cannot self-approve. Approval transitions happen only through
``apps.employers.services.approval_service``.
"""

from __future__ import annotations

from rest_framework import serializers

from apps.employers.models import EmployerProfile

# Company-profile fields the employer may edit themselves.
EDITABLE_PROFILE_FIELDS = [
    "company_name",
    "contact_person",
    "phone",
    "company_summary",
    "website",
    "industry",
    "company_size",
    "company_location",
    "culture_text",
    "benefits_text",
]


class EmployerProfileSerializer(serializers.ModelSerializer):
    """Read/update the signed-in employer's own company profile.

    Writable: the company-profile fields. Read-only: the approval lifecycle.
    """

    class Meta:
        model = EmployerProfile
        fields = [
            *EDITABLE_PROFILE_FIELDS,
            # Read-only lifecycle/state fields surfaced for display only.
            "approval_status",
            "approval_reason",
            "approved_at",
            "suspended_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "approval_status",
            "approval_reason",
            "approved_at",
            "suspended_at",
            "created_at",
            "updated_at",
        ]


class EmployerApprovalStatusSerializer(serializers.Serializer):
    """Compact approval-status payload for the employer's own status screen."""

    approval_status = serializers.CharField()
    approval_reason = serializers.CharField(allow_blank=True)
    can_publish = serializers.BooleanField()
    company_name = serializers.CharField()
    contact_person = serializers.CharField()
    submitted_at = serializers.DateTimeField(allow_null=True)
    approved_at = serializers.DateTimeField(allow_null=True)
    suspended_at = serializers.DateTimeField(allow_null=True)
