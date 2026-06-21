"""Candidate self-service API (spec §14.7, §14.9, §21.2, §22.2).

Every endpoint is gated by ``IsCandidate`` (authenticated candidate, not
deactivated) and is structurally scoped to the SIGNED-IN candidate's own
profile via :func:`_own_profile` — there is no path/lookup parameter, so one
candidate can never address another's profile or resume.

Resume security model (ADR-0001 §5):
  * Bytes live in private storage under an opaque server-generated name.
  * The download view (:class:`ResumeDownloadView`) is the ONLY way to read the
    bytes; it re-checks ownership and streams via ``FileResponse`` with a safe
    ``Content-Disposition``. No ``FileField.url`` is ever returned.
  * Employer access to an applicant's resume is Phase 6/7 — deliberately NOT
    built here; the serving pattern below is the template a future
    employer-access variant will reuse (object-level check, then stream).
"""

from __future__ import annotations

from pathlib import PurePosixPath

from django.http import FileResponse
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCandidate
from apps.audit.services import record_action
from apps.candidates.models import CandidateProfile
from apps.candidates.selectors import dashboard_snapshot, saved_jobs_list
from apps.candidates.serializers import (
    CandidateProfileSerializer,
    ResumeMetadataSerializer,
    SavedJobSerializer,
)
from apps.candidates.services import resume_service, saved_job_service


def _own_profile(request: Request) -> CandidateProfile:
    """Return (creating if missing) the signed-in candidate's own profile.

    Scoped by ``request.user``; never by a client-supplied id. A candidate whose
    profile row does not yet exist (edge case) gets an empty one so GET/PATCH and
    the dashboard always have an object to operate on.
    """
    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    return profile


class CandidateProfileView(APIView):
    """GET / PATCH the signed-in candidate's own profile."""

    permission_classes = [IsCandidate]

    def get(self, request: Request) -> Response:
        profile = _own_profile(request)
        return Response(CandidateProfileSerializer(profile).data)

    def patch(self, request: Request) -> Response:
        profile = _own_profile(request)
        serializer = CandidateProfileSerializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ResumeView(APIView):
    """Upload (POST) / remove (DELETE) the signed-in candidate's resume.

    Upload is multipart with a ``file`` field. Validation + storage + metadata +
    audit happen atomically in the resume service. The response is metadata only
    — never a URL or storage path.
    """

    permission_classes = [IsCandidate]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request: Request) -> Response:
        upload = request.FILES.get("file")
        profile = _own_profile(request)
        profile = resume_service.store_resume(profile=profile, upload=upload, actor=request.user)
        return Response(ResumeMetadataSerializer(profile).data, status=status.HTTP_201_CREATED)

    def delete(self, request: Request) -> Response:
        profile = _own_profile(request)
        resume_service.remove_resume(profile=profile, actor=request.user)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResumeDownloadView(APIView):
    """Permission-checked streaming download of the OWNER's resume.

    This is the only retrieval path for resume bytes. Ownership is structural
    (``_own_profile`` is scoped to ``request.user``); 404 if the candidate has no
    resume. The filename in ``Content-Disposition`` is the sanitised display name
    so a crafted original name cannot inject header content.
    """

    permission_classes = [IsCandidate]

    def get(self, request: Request) -> Response | FileResponse:
        profile = _own_profile(request)
        if not profile.resume_file:
            return Response(
                {"detail": "No resume has been uploaded."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Lightweight audit of access-sensitive reads (spec §22.2, §20.13).
        record_action(actor=request.user, action="resume.downloaded", target=profile)

        ext = PurePosixPath(profile.resume_file.name).suffix.lower()
        content_type = {
            ".pdf": "application/pdf",
            ".docx": ("application/vnd.openxmlformats-officedocument.wordprocessingml.document"),
        }.get(ext, "application/octet-stream")

        filename = profile.resume_original_name or f"resume{ext}"
        # Open through the storage backend (never a raw filesystem path) so the
        # private object-storage swap (ADR-0001 §5.7) is transparent.
        response = FileResponse(
            profile.resume_file.open("rb"),
            content_type=content_type,
            as_attachment=True,
            filename=filename,
        )
        return response


class CandidateDashboardView(APIView):
    """GET the signed-in candidate's dashboard snapshot (real stats)."""

    permission_classes = [IsCandidate]

    def get(self, request: Request) -> Response:
        profile = _own_profile(request)
        return Response(dashboard_snapshot(profile))


class SavedJobsView(APIView):
    """List (GET) / create (POST) the signed-in candidate's saved jobs.

    Structurally owner-scoped via :func:`_own_profile` (no candidate id in the
    path), so one candidate can never see or modify another's bookmarks.

    POST accepts ``{"job": "<slug-or-id>"}`` and is idempotent: saving an
    already-saved job returns 200 with the existing row (a no-op) rather than a
    409, which keeps an over-eager "save" button harmless. Only currently-public
    jobs may be saved (resolved through ``Job.objects.public()`` in the service).
    """

    permission_classes = [IsCandidate]

    def get(self, request: Request) -> Response:
        profile = _own_profile(request)
        saved = saved_jobs_list(profile)
        context = self._availability_context(saved)
        return Response(SavedJobSerializer(saved, many=True, context=context).data)

    def post(self, request: Request) -> Response:
        profile = _own_profile(request)
        job_ref = request.data.get("job")
        saved, created = saved_job_service.save_job(profile=profile, job_ref=job_ref)
        context = self._availability_context([saved])
        status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(
            SavedJobSerializer(saved, context=context).data,
            status=status_code,
        )

    @staticmethod
    def _availability_context(saved) -> dict:
        """Resolve the public job-id set once for the rows being serialised."""
        from apps.jobs.models import Job

        job_ids = [sj.job_id for sj in saved]
        available = set(Job.objects.public().filter(pk__in=job_ids).values_list("pk", flat=True))
        return {"available_job_ids": available}


class SavedJobDetailView(APIView):
    """DELETE a saved job by JOB id (spec §21.2).

    The path parameter is the JOB id (not the SavedJob row id) so the client can
    un-save directly from a job card without first looking up the bookmark id.
    Deletion is scoped to the signed-in candidate's own profile; an unknown or
    non-owned bookmark yields 404 (no existence leak across candidates).
    """

    permission_classes = [IsCandidate]

    def delete(self, request: Request, job_id: str) -> Response:
        profile = _own_profile(request)
        deleted = saved_job_service.unsave_job(profile=profile, job_id=job_id)
        if not deleted:
            return Response(
                {"code": "not_found", "message": "The requested resource was not found."},
                status=status.HTTP_404_NOT_FOUND,
            )
        return Response(status=status.HTTP_204_NO_CONTENT)
