"""Application API: candidate apply + candidate tracking (spec §21.5).

All endpoints are candidate-scoped to ``request.user``; an employer/admin path
to applications is Phase 7. ``employer_private_notes`` is never exposed here.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCandidate
from apps.jobs.models import Job

from ..models import Application
from ..serializers import (
    ApplicationDetailSerializer,
    ApplicationListSerializer,
    ApplyInputSerializer,
)
from ..services.apply_service import submit_application


def _candidate_profile_or_400(request: Request):
    profile = getattr(request.user, "candidate_profile", None)
    if profile is None:
        from rest_framework.exceptions import ValidationError

        raise ValidationError({"detail": "Candidate profile is required."})
    return profile


class ApplyView(APIView):
    """POST /api/v1/jobs/{slug}/apply/ — apply to a public job."""

    permission_classes = [IsCandidate]

    def post(self, request: Request, slug: str) -> Response:
        job = Job.objects.public().filter(slug=slug).first()
        if job is None:
            return Response(
                {"code": "not_found", "message": "The requested resource was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        profile = _candidate_profile_or_400(request)
        payload = ApplyInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        application = submit_application(
            candidate=profile,
            job=job,
            cover_letter=payload.validated_data["cover_letter"],
            answers_by_question=payload.validated_data["answers"],
        )
        return Response(
            ApplicationDetailSerializer(application).data, status=status.HTTP_201_CREATED
        )


class JobApplicationStatusView(APIView):
    """GET /api/v1/jobs/{slug}/application/ — the signed-in candidate's
    application for this job (the "already applied" signal); 404 if none."""

    permission_classes = [IsCandidate]

    def get(self, request: Request, slug: str) -> Response:
        profile = _candidate_profile_or_400(request)
        application = (
            Application.objects.filter(candidate=profile, job__slug=slug)
            .select_related("job", "job__employer")
            .prefetch_related("answers__question", "status_history__changed_by")
            .first()
        )
        if application is None:
            return Response(
                {"code": "not_found", "message": "No application found for this job."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(ApplicationDetailSerializer(application).data)


class CandidateApplicationListView(ListAPIView):
    """GET /api/v1/candidate/applications/ — own applications, newest first."""

    permission_classes = [IsCandidate]
    serializer_class = ApplicationListSerializer

    def get_queryset(self):
        profile = _candidate_profile_or_400(self.request)
        return Application.objects.filter(candidate=profile).select_related("job", "job__employer")


class CandidateApplicationDetailView(RetrieveAPIView):
    """GET /api/v1/candidate/applications/{id}/ — own application detail."""

    permission_classes = [IsCandidate]
    serializer_class = ApplicationDetailSerializer
    lookup_field = "pk"

    def get_queryset(self):
        profile = _candidate_profile_or_400(self.request)
        return (
            Application.objects.filter(candidate=profile)
            .select_related("job", "job__employer")
            .prefetch_related("answers__question", "status_history__changed_by")
        )
