"""Employer profile + approval-status API (spec §21.3, §22.1).

Object scoping is structural: every view resolves the target from
``request.user.employer_profile``, so an employer can only ever read or edit
their OWN profile — there is no id in the path to tamper with, eliminating
ID-based cross-tenant leakage. ``IsEmployer`` admits any approval status
(PENDING/APPROVED/REJECTED/SUSPENDED) so a not-yet-approved employer can still
manage their details and watch their status; the APPROVED gate
(``IsApprovedEmployer``) guards write actions like publishing, not this profile.

Views stay thin: the writable serializer enforces which fields are settable and
the approval lifecycle is never client-writable.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsApprovedEmployer, IsEmployer
from apps.employers.models import EmployerProfile
from apps.employers.serializers import (
    EmployerApprovalStatusSerializer,
    EmployerProfileSerializer,
)


def _own_profile(request: Request) -> EmployerProfile:
    """Return the signed-in employer's own profile or 404 (never another's)."""
    profile = getattr(request.user, "employer_profile", None)
    if profile is None:
        raise NotFound("No employer profile is associated with this account.")
    return profile


class EmployerProfileView(APIView):
    """GET / PATCH the signed-in employer's own company profile."""

    permission_classes = [IsEmployer]

    def get(self, request: Request) -> Response:
        profile = _own_profile(request)
        return Response(EmployerProfileSerializer(profile).data)

    def patch(self, request: Request) -> Response:
        profile = _own_profile(request)
        serializer = EmployerProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)


class EmployerApprovalStatusView(APIView):
    """GET the signed-in employer's approval status summary."""

    permission_classes = [IsEmployer]

    def get(self, request: Request) -> Response:
        profile = _own_profile(request)
        can_publish = IsApprovedEmployer().has_permission(request, self)
        payload = {
            "approval_status": profile.approval_status,
            # Only meaningful when rejected; blank otherwise.
            "approval_reason": (
                profile.approval_reason
                if profile.approval_status == EmployerProfile.ApprovalStatus.REJECTED
                else ""
            ),
            "can_publish": can_publish,
            "company_name": profile.company_name,
            "contact_person": profile.contact_person,
            "submitted_at": profile.created_at,
            "approved_at": profile.approved_at,
            "suspended_at": profile.suspended_at,
        }
        return Response(EmployerApprovalStatusSerializer(payload).data)
