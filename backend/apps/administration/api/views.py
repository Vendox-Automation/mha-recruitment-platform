"""Admin employer-approval API (scope addition: in-app admin UI).

This is a cross-domain ADMIN surface, kept out of the employers app's
self-service views deliberately: the employers app owns what an employer may do
to their OWN profile, whereas this app exposes the administrator's read +
approval-action view over EVERY employer. Authorisation is authoritative here
via ``IsAdministrator`` on every view (frontend guards are UX only).

Views stay thin. All four state transitions delegate to
``apps.employers.services.approval_service`` — the single owner of the approval
workflow — which runs each change in its own ``transaction.atomic``, syncs the
related ``User.status``, writes the audit entry, and sends any email. We never
re-implement the lifecycle or write ``EmployerProfile`` status fields directly.
An ``IllegalTransition`` is mapped to a 400 validation error in the project's
normalised envelope rather than bubbling up as a 500.
"""

from __future__ import annotations

from collections.abc import Callable

from django.db.models import Case, Exists, IntegerField, OuterRef, Q, QuerySet, Value, When
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsAdministrator
from apps.employers.models import EmployerProfile
from apps.employers.services import approval_service
from apps.employers.services.approval_service import IllegalTransition
from apps.reviews.models import CompanyReview, EmployerReply
from apps.reviews.services import delete_reply, delete_review

from .serializers import (
    AdminReviewSerializer,
    EmployerDetailSerializer,
    EmployerListItemSerializer,
    RejectSerializer,
    SummarySerializer,
)

AS = EmployerProfile.ApprovalStatus

# select_related the two user FKs every serializer touches (user.email,
# approved_by.email) so the queue/detail never N+1s.
_BASE_QS = EmployerProfile.objects.select_related("user", "approved_by")


class AdminSummaryView(APIView):
    """GET employer-state counts for the admin dashboard."""

    permission_classes = [IsAdministrator]

    def get(self, request: Request) -> Response:
        rows = EmployerProfile.objects.values_list("approval_status", flat=True)
        counts = {AS.PENDING: 0, AS.APPROVED: 0, AS.REJECTED: 0, AS.SUSPENDED: 0}
        total = 0
        for value in rows:
            total += 1
            if value in counts:
                counts[value] += 1
        payload = {
            "pending_employers": counts[AS.PENDING],
            "approved_employers": counts[AS.APPROVED],
            "suspended_employers": counts[AS.SUSPENDED],
            "rejected_employers": counts[AS.REJECTED],
            "total_employers": total,
        }
        return Response(SummarySerializer(payload).data)


class AdminEmployerListView(ListAPIView):
    """GET the admin employer queue: optional status filter + search.

    PENDING rows float to the top (the queue's purpose is triage), then most
    recently created first.
    """

    permission_classes = [IsAdministrator]
    serializer_class = EmployerListItemSerializer

    def get_queryset(self) -> QuerySet[EmployerProfile]:
        qs = _BASE_QS.all()

        status_param = self.request.query_params.get("status")
        if status_param:
            normalised = status_param.strip().upper()
            if normalised in AS.values:
                qs = qs.filter(approval_status=normalised)
            else:
                # Unknown status value: no rows rather than silently ignoring it.
                qs = qs.none()

        search = self.request.query_params.get("search")
        if search:
            term = search.strip()
            if term:
                qs = qs.filter(
                    Q(company_name__icontains=term)
                    | Q(user__email__icontains=term)
                    | Q(contact_person__icontains=term)
                )

        # PENDING first (triage queue), then newest first.
        return qs.annotate(
            _pending_first=Case(
                When(approval_status=AS.PENDING, then=Value(0)),
                default=Value(1),
                output_field=IntegerField(),
            )
        ).order_by("_pending_first", "-created_at")


class AdminEmployerDetailView(RetrieveAPIView):
    """GET a single employer's full admin detail."""

    permission_classes = [IsAdministrator]
    serializer_class = EmployerDetailSerializer
    queryset = _BASE_QS.all()
    lookup_url_kwarg = "id"
    lookup_field = "pk"


class _EmployerActionView(APIView):
    """Base for the four approval-action endpoints.

    Subclasses set :attr:`action` to the matching ``approval_service`` callable.
    Each resolves the target (404 on unknown id), invokes the service (which owns
    the transaction + audit + email), maps an ``IllegalTransition`` to a 400, and
    returns the refreshed detail payload.
    """

    permission_classes = [IsAdministrator]
    action: Callable[..., EmployerProfile]

    def get_object(self, employer_id: int) -> EmployerProfile:
        return get_object_or_404(_BASE_QS, pk=employer_id)

    def run_action(self, request: Request, profile: EmployerProfile) -> EmployerProfile:
        return type(self).action(profile, actor=request.user)

    def post(self, request: Request, id: int) -> Response:  # noqa: A002 (URL kwarg name)
        profile = self.get_object(id)
        try:
            updated = self.run_action(request, profile)
        except IllegalTransition as exc:
            # Surface as a normalised validation_error (400), not a 500.
            raise ValidationError(str(exc)) from exc
        updated.refresh_from_db()
        return Response(
            EmployerDetailSerializer(_BASE_QS.get(pk=updated.pk)).data,
            status=status.HTTP_200_OK,
        )


class AdminEmployerApproveView(_EmployerActionView):
    action = staticmethod(approval_service.approve_employer)


class AdminEmployerRejectView(_EmployerActionView):
    action = staticmethod(approval_service.reject_employer)

    def post(self, request: Request, id: int) -> Response:  # noqa: A002
        # Validate the reason up front so a missing/blank reason is a field error
        # on ``reason`` rather than a generic message.
        serializer = RejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reason = serializer.validated_data["reason"]

        profile = self.get_object(id)
        try:
            updated = approval_service.reject_employer(profile, actor=request.user, reason=reason)
        except IllegalTransition as exc:
            raise ValidationError(str(exc)) from exc
        updated.refresh_from_db()
        return Response(
            EmployerDetailSerializer(_BASE_QS.get(pk=updated.pk)).data,
            status=status.HTTP_200_OK,
        )


class AdminEmployerSuspendView(_EmployerActionView):
    action = staticmethod(approval_service.suspend_employer)


class AdminEmployerRestoreView(_EmployerActionView):
    action = staticmethod(approval_service.restore_employer)


# --- Review moderation (reactive: read + delete, audited) ------------------


class AdminReviewListView(ListAPIView):
    """GET the admin review-moderation queue: optional company + search.

    ``has_reply`` is annotated with an ``Exists`` subquery so the row carries the
    flag without a per-row query. ``reviewer_email`` is exposed here (admins may
    see it); it is never on the public surface.
    """

    permission_classes = [IsAdministrator]
    serializer_class = AdminReviewSerializer

    def get_queryset(self) -> QuerySet[CompanyReview]:
        qs = CompanyReview.objects.select_related("employer").annotate(
            has_reply=Exists(EmployerReply.objects.filter(review=OuterRef("pk")))
        )

        company = self.request.query_params.get("company")
        if company:
            slug = company.strip()
            if slug:
                qs = qs.filter(employer__slug=slug)

        # Optional star filter. Only a valid 1–5 integer narrows the queryset;
        # anything else (blank, "ALL", out of range, non-numeric) is ignored so
        # the list falls back to "all ratings".
        rating = self.request.query_params.get("rating")
        if rating:
            try:
                value = int(rating)
            except (TypeError, ValueError):
                value = None
            if value is not None and 1 <= value <= 5:
                qs = qs.filter(rating=value)

        search = self.request.query_params.get("search")
        if search:
            term = search.strip()
            if term:
                qs = qs.filter(
                    Q(reviewer_name__icontains=term)
                    | Q(reviewer_email__icontains=term)
                    | Q(title__icontains=term)
                    | Q(body__icontains=term)
                )

        return qs.order_by("-created_at")


class AdminReviewDeleteView(APIView):
    """DELETE a review (cascades its reply) via the audited service. 204."""

    permission_classes = [IsAdministrator]

    def delete(self, request: Request, id: int) -> Response:  # noqa: A002 (URL kwarg)
        review = CompanyReview.objects.filter(pk=id).first()
        if review is None:
            raise NotFound("The requested resource was not found.")
        delete_review(review, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminReviewReplyDeleteView(APIView):
    """DELETE just the employer reply on a review via the audited service. 204."""

    permission_classes = [IsAdministrator]

    def delete(self, request: Request, id: int) -> Response:  # noqa: A002 (URL kwarg)
        reply = EmployerReply.objects.filter(review_id=id).first()
        if reply is None:
            raise NotFound("The requested resource was not found.")
        delete_reply(reply, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
