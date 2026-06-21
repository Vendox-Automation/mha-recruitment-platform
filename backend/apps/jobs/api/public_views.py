"""Public job + company API (AllowAny) (spec §14.2-14.4, §21.4, §21.7).

These endpoints are intentionally public, so they declare ``AllowAny``
explicitly to override the project-wide ``IsAuthenticated`` default. Visibility
is enforced entirely server-side: jobs come only from ``Job.objects.public()``
and companies only from APPROVED employer profiles, so a draft / suspended /
closed / expired / archived job, or an unapproved employer, can never appear.

Lookups are by ``slug`` (non-enumerable, SEO-friendly) per ADR-0001 §7.4.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.generics import ListAPIView
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.analytics.services.recording import record_job_view
from apps.jobs.models import Job
from apps.jobs.selectors import search
from apps.jobs.selectors.companies import (
    approved_companies_with_job_counts,
    get_public_company_or_none,
)
from apps.jobs.serializers import (
    PublicCompanyDetailSerializer,
    PublicCompanyListSerializer,
    PublicJobDetailSerializer,
    PublicJobListSerializer,
)


class PublicJobListView(ListAPIView):
    """GET /api/v1/jobs/ — search public jobs (filters + sort + pagination)."""

    permission_classes = [AllowAny]
    serializer_class = PublicJobListSerializer
    throttle_scope = "public"

    def get_queryset(self):
        return search.search_public_jobs(self.request.query_params)


class PublicJobDetailView(APIView):
    """GET /api/v1/jobs/{slug}/ — public job detail; 404 if not public."""

    permission_classes = [AllowAny]
    throttle_scope = "public"

    def get(self, request: Request, slug: str) -> Response:
        job = (
            Job.objects.public()
            .select_related("employer")
            .prefetch_related("screening_questions")
            .filter(slug=slug)
            .first()
        )
        if job is None:
            return Response(
                {"code": "not_found", "message": "The requested resource was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        # Best-effort, privacy-aware view telemetry (spec §20.12). The recording
        # service de-duplicates per (job, viewer) and never stores PII; it
        # swallows its own errors so telemetry can never break the page.
        record_job_view(job, request)
        return Response(PublicJobDetailSerializer(job, context={"request": request}).data)


class PublicCompanyListView(ListAPIView):
    """GET /api/v1/companies/ — approved companies with active-job counts."""

    permission_classes = [AllowAny]
    serializer_class = PublicCompanyListSerializer
    throttle_scope = "public"

    def get_queryset(self):
        name = (self.request.query_params.get("name") or "").strip()
        return approved_companies_with_job_counts(name=name)


class PublicCompanyDetailView(APIView):
    """GET /api/v1/companies/{slug}/ — approved-company detail; 404 otherwise."""

    permission_classes = [AllowAny]
    throttle_scope = "public"

    def get(self, request: Request, slug: str) -> Response:
        company = get_public_company_or_none(slug)
        if company is None:
            return Response(
                {"code": "not_found", "message": "The requested resource was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(PublicCompanyDetailSerializer(company, context={"request": request}).data)
