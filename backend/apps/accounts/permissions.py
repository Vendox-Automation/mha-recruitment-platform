"""DRF permission classes (spec §22.1, AGENTS §10).

Authorisation is authoritative in Django. Frontend guards are UX only; every
sensitive endpoint must declare an explicit permission class here. All six role
/ status boundaries are exercised by tests (candidate, pending employer,
approved employer, rejected employer, suspended employer, administrator).
"""

from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.accounts.models import User


class IsActiveAccount(BasePermission):
    """Base policy: authenticated and not DEACTIVATED.

    SUSPENDED and PENDING accounts may still authenticate (they see restricted
    screens), so this base does not reject them. Endpoints that must exclude
    suspended/pending accounts compose a stricter class below.
    """

    message = "Your account cannot perform this action."

    def has_permission(self, request, view) -> bool:
        user = request.user
        if not (user and user.is_authenticated):
            return False
        return user.status != User.Status.DEACTIVATED


class IsCandidate(IsActiveAccount):
    """Authenticated candidate (not deactivated)."""

    message = "Only candidate accounts can perform this action."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and request.user.is_candidate


class IsEmployer(IsActiveAccount):
    """Authenticated employer (any approval status, not deactivated)."""

    message = "Only employer accounts can perform this action."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and request.user.is_employer


class IsApprovedEmployer(IsActiveAccount):
    """Employer whose profile is APPROVED and whose account status is ACTIVE.

    This is the gate for employer write actions (e.g. publishing jobs). A pending,
    rejected, or suspended employer is rejected here even though it can sign in.
    """

    message = "Your employer account must be approved to perform this action."

    def has_permission(self, request, view) -> bool:
        if not super().has_permission(request, view):
            return False
        user = request.user
        if not user.is_employer:
            return False
        if user.status != User.Status.ACTIVE:
            return False
        profile = getattr(user, "employer_profile", None)
        if profile is None:
            return False
        return profile.approval_status == profile.ApprovalStatus.APPROVED


class IsAdministrator(IsActiveAccount):
    """Authenticated administrator (not deactivated)."""

    message = "Only administrators can perform this action."

    def has_permission(self, request, view) -> bool:
        return super().has_permission(request, view) and request.user.is_administrator
