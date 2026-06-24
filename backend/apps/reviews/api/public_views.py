"""Public company-review API (AllowAny) (product scope addition).

These endpoints are intentionally public, so they declare ``AllowAny`` to
override the project-wide ``IsAuthenticated`` default. Visibility mirrors the
public company surface: reviews are only ever listed/created for an APPROVED
employer, resolved through the SAME ``get_public_company_or_none`` selector the
public company detail uses, so a pending / rejected / suspended company yields a
404 (never confirming it exists, never accepting a review for it).

The reviewer's email is accepted on POST for moderation/contact but is never
echoed back — the response uses the public serializer, which has no email field.

The create path is throttled with the ``review`` scope (mirrors the public
support intake's ``support`` scope) to bound abusive/automated posting.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.generics import ListCreateAPIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.jobs.selectors.companies import get_public_company_or_none
from apps.reviews.api.serializers import (
    PublicReviewCreateSerializer,
    PublicReviewSerializer,
)
from apps.reviews.models import CompanyReview
from apps.reviews.services import create_review

_NOT_FOUND = {"code": "not_found", "message": "The requested resource was not found."}


class PublicCompanyReviewView(ListCreateAPIView):
    """GET/POST /api/v1/companies/{slug}/reviews/ — list + public create.

    Both verbs first resolve the slug to an APPROVED company (404 otherwise), so
    an unapproved/unknown company can neither be listed nor reviewed.
    """

    permission_classes = [AllowAny]
    serializer_class = PublicReviewSerializer

    def get_throttles(self):
        # Only the create path is rate-limited (the ``review`` scope). Listing
        # rides the generic public/anon ceilings like other public reads.
        if self.request.method == "POST":
            self.throttle_scope = "review"
        return super().get_throttles()

    def _get_company_or_404(self):
        company = get_public_company_or_none(self.kwargs["slug"])
        if company is None:
            return None
        return company

    def list(self, request, *args, **kwargs):
        company = self._get_company_or_404()
        if company is None:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)
        queryset = (
            CompanyReview.objects.filter(employer=company)
            .select_related("reply")
            .order_by("-created_at")
        )
        page = self.paginate_queryset(queryset)
        serializer = PublicReviewSerializer(page, many=True, context=self.get_serializer_context())
        return self.get_paginated_response(serializer.data)

    def create(self, request, *args, **kwargs):
        company = self._get_company_or_404()
        if company is None:
            return Response(_NOT_FOUND, status=status.HTTP_404_NOT_FOUND)
        serializer = PublicReviewCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        review = create_review(
            company,
            reviewer_name=data["reviewer_name"],
            reviewer_email=data["reviewer_email"],
            rating=data["rating"],
            title=data.get("title", ""),
            body=data.get("body", ""),
        )
        # Respond with the public serializer — the email is never echoed.
        return Response(
            PublicReviewSerializer(review, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )
