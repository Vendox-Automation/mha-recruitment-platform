"""Employer reply API (product scope addition).

SECURITY MODEL — employer isolation is enforced by queryset scoping, not by
trusting any client-supplied id (mirrors the employer applicant workspace). A
review is only reachable when its ``employer`` is the requesting employer's own
profile; a review of ANOTHER company is simply not in the scoped queryset and
resolves to 404, leaking nothing about its existence.

``IsApprovedEmployer`` gates the whole surface: a pending / rejected / suspended
employer (or any non-employer) is rejected before any queryset runs. The single
reply is upserted through the ``set_reply`` service (one reply per review).
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsApprovedEmployer
from apps.reviews.api.serializers import EmployerReplyInputSerializer, EmployerReplySerializer
from apps.reviews.models import CompanyReview
from apps.reviews.services import delete_reply, set_reply


class EmployerReviewReplyView(APIView):
    """POST/DELETE /api/v1/employer/reviews/{review_id}/reply/.

    The employer may create-or-update, then delete, the single reply on a review
    of their OWN company. Cross-employer access is impossible: the lookup is
    scoped to ``request.user.employer_profile``.
    """

    permission_classes = [IsApprovedEmployer]

    def _get_owned_review_or_404(self, request: Request, review_id: int) -> CompanyReview:
        profile = request.user.employer_profile
        review = CompanyReview.objects.filter(pk=review_id, employer=profile).first()
        if review is None:
            # Same 404 whether the review is missing or belongs to another
            # employer — never confirm a cross-employer review's existence.
            raise NotFound("The requested resource was not found.")
        return review

    def post(self, request: Request, review_id: int) -> Response:
        review = self._get_owned_review_or_404(request, review_id)
        serializer = EmployerReplyInputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        reply = set_reply(
            review,
            author=request.user,
            body=serializer.validated_data["body"],
        )
        return Response(EmployerReplySerializer(reply).data, status=status.HTTP_200_OK)

    def delete(self, request: Request, review_id: int) -> Response:
        review = self._get_owned_review_or_404(request, review_id)
        reply = getattr(review, "reply", None)
        if reply is None:
            raise NotFound("The requested resource was not found.")
        delete_reply(reply, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)
