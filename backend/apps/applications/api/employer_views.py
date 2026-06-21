"""Employer applicant-workspace API (spec §14.10, §14.12, §21.3, §21.5, §22.1).

SECURITY MODEL — employer isolation is enforced by *queryset scoping*, not by
trusting any client-supplied id. Every view that reaches an application does so
through :func:`apps.applications.permissions.employer_applications`, which filters
``job.employer == request.user.employer_profile``. An application to another
employer's job — or to an MHA-owned job (employer null) — is therefore not in the
queryset and resolves to 404, leaking nothing about its existence.

``IsApprovedEmployer`` gates the whole surface: a pending / rejected / suspended
employer (or any non-employer) is rejected before any queryset runs.

The applicant resume snapshot is private personal data. It is reachable ONLY via
:class:`EmployerApplicationResumeView`, which re-resolves the application through
the scoped queryset and streams the bytes via ``FileResponse``; no
``FileField.url`` is ever serialised, so there is no public/predictable URL.
"""

from __future__ import annotations

from pathlib import PurePosixPath

from django.db.models import Q
from django.http import FileResponse
from rest_framework import status
from rest_framework.exceptions import NotFound
from rest_framework.generics import ListAPIView
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsApprovedEmployer
from apps.audit.services import record_action
from apps.jobs.models import Job

from ..employer_serializers import (
    EmployerApplicationDetailSerializer,
    EmployerApplicationListSerializer,
    NotesInputSerializer,
    StatusChangeInputSerializer,
)
from ..models import Application, ApplicationStatus
from ..permissions import employer_applications
from ..selectors import employer_dashboard_snapshot
from ..services import status_service

# Sort keys the employer list accepts (portable, explicit allowlist).
_ORDERING_FIELDS = {
    "submitted_at": "submitted_at",
    "-submitted_at": "-submitted_at",
    "updated_at": "updated_at",
    "-updated_at": "-updated_at",
    "status": "status",
    "-status": "-status",
}


def _base_qs(request: Request):
    """Employer-scoped applications with the relations the serializers need."""
    return employer_applications(request.user).select_related("job", "job__employer", "candidate")


def _get_owned_application_or_404(request: Request, pk) -> Application:
    """Resolve one application owned by the requesting employer, or raise 404.

    The scoped queryset is the isolation boundary: a non-owned (or MHA-owned)
    application simply is not found, so cross-employer probing yields the same
    404 as a non-existent id.
    """
    application = (
        _base_qs(request)
        .prefetch_related("answers__question", "status_history__changed_by")
        .filter(pk=pk)
        .first()
    )
    if application is None:
        raise NotFound("The requested resource was not found.")
    return application


class EmployerApplicationListView(ListAPIView):
    """GET /api/v1/employer/applications/ — applicants across the employer's jobs.

    Filters: ``job`` (job id), ``status`` (one of the seven), ``search``
    (candidate name / preferred title, case-insensitive). Ordering: ``ordering``
    from an explicit allowlist (default newest first). Paginated.
    """

    permission_classes = [IsApprovedEmployer]
    serializer_class = EmployerApplicationListSerializer

    def get_queryset(self):
        qs = _base_qs(self.request)
        params = self.request.query_params

        job_id = (params.get("job") or "").strip()
        if job_id:
            qs = qs.filter(job_id=job_id)

        status_value = (params.get("status") or "").strip()
        if status_value in ApplicationStatus.values:
            qs = qs.filter(status=status_value)

        search = (params.get("search") or "").strip()
        if search:
            # Explicit __icontains for Postgres/SQLite parity (ADR §6.1.7).
            qs = qs.filter(
                Q(candidate__full_name__icontains=search)
                | Q(candidate__preferred_job_title__icontains=search)
            )

        ordering = _ORDERING_FIELDS.get((params.get("ordering") or "").strip(), "-submitted_at")
        return qs.order_by(ordering)


class EmployerJobApplicationListView(ListAPIView):
    """GET /api/v1/employer/jobs/{job_id}/applications/ — applicants to one job.

    404 if the job is not owned by the requesting employer (or does not exist).
    """

    permission_classes = [IsApprovedEmployer]
    serializer_class = EmployerApplicationListSerializer

    def get_queryset(self):
        profile = getattr(self.request.user, "employer_profile", None)
        job = (
            Job.objects.for_employer(profile).filter(pk=self.kwargs["job_id"]).first()
            if profile is not None
            else None
        )
        if job is None:
            raise NotFound("The requested resource was not found.")
        status_value = (self.request.query_params.get("status") or "").strip()
        qs = _base_qs(self.request).filter(job=job)
        if status_value in ApplicationStatus.values:
            qs = qs.filter(status=status_value)
        return qs.order_by("-submitted_at")


class EmployerApplicationDetailView(APIView):
    """GET /api/v1/employer/applications/{id}/ — owned-application detail."""

    permission_classes = [IsApprovedEmployer]

    def get(self, request: Request, pk) -> Response:
        application = _get_owned_application_or_404(request, pk)
        return Response(EmployerApplicationDetailSerializer(application).data)


class EmployerApplicationStatusView(APIView):
    """PATCH /api/v1/employer/applications/{id}/status/ — change status."""

    permission_classes = [IsApprovedEmployer]

    def patch(self, request: Request, pk) -> Response:
        application = _get_owned_application_or_404(request, pk)
        payload = StatusChangeInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        application = status_service.change_status(
            application=application,
            new_status=payload.validated_data["status"],
            actor=request.user,
            change_note=payload.validated_data["change_note"],
        )
        # Re-fetch with relations so the response carries the fresh history row.
        application = _get_owned_application_or_404(request, pk)
        return Response(EmployerApplicationDetailSerializer(application).data)


class EmployerApplicationNotesView(APIView):
    """PATCH /api/v1/employer/applications/{id}/notes/ — employer-only notes.

    These notes are NEVER exposed to candidates (the candidate serializers omit
    the field entirely); this endpoint only writes them on the employer side.
    """

    permission_classes = [IsApprovedEmployer]

    def patch(self, request: Request, pk) -> Response:
        application = _get_owned_application_or_404(request, pk)
        payload = NotesInputSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        application = status_service.update_private_notes(
            application=application,
            notes=payload.validated_data["employer_private_notes"],
            actor=request.user,
        )
        application = _get_owned_application_or_404(request, pk)
        return Response(EmployerApplicationDetailSerializer(application).data)


class EmployerApplicationResumeView(APIView):
    """GET /api/v1/employer/applications/{id}/resume/ — stream the snapshot.

    Permission-checked download of the resume snapshot for an application to one
    of the employer's OWN jobs. Object-level authorisation is the scoped queryset
    (404 for any non-owned / MHA / non-existent application, and anonymous is
    rejected by the permission class). Bytes are streamed through the storage
    backend via ``FileResponse`` — there is no public URL, and the field's
    ``.url`` is never serialised. The access is audited.
    """

    permission_classes = [IsApprovedEmployer]

    def get(self, request: Request, pk) -> Response | FileResponse:
        application = _get_owned_application_or_404(request, pk)
        if not application.resume_file_snapshot:
            raise NotFound("No resume is attached to this application.")

        record_action(
            actor=request.user,
            action="resume.downloaded",
            target=application,
            metadata={"context": "employer", "job_id": str(application.job_id)},
        )

        ext = PurePosixPath(application.resume_file_snapshot.name).suffix.lower()
        content_type = {
            ".pdf": "application/pdf",
            ".docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        }.get(ext, "application/octet-stream")

        filename = application.resume_snapshot_name or f"resume{ext}"
        # Open through the storage backend (never a raw path) so the private
        # object-storage swap (ADR-0001 §5.7) stays transparent.
        return FileResponse(
            application.resume_file_snapshot.open("rb"),
            content_type=content_type,
            as_attachment=True,
            filename=filename,
        )


class EmployerDashboardView(APIView):
    """GET /api/v1/employer/dashboard/ — attention queue + pipeline (real counts).

    All counts are scoped to the employer's own jobs/applications and computed
    from the DB; no view/time-series metric is fabricated (that is Phase 9).
    """

    permission_classes = [IsApprovedEmployer]

    def get(self, request: Request) -> Response:
        profile = getattr(request.user, "employer_profile", None)
        if profile is None:  # defensive; IsApprovedEmployer guarantees a profile
            return Response(
                {"code": "not_found", "message": "No employer profile."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(employer_dashboard_snapshot(profile))
