"""Candidate-facing Smart Job Fit API (spec §16, §21.6, §22.3).

Two endpoints, both ``IsCandidate`` and both scoped to the SIGNED-IN candidate's
own profile (no candidate can request another's fit). The job is resolved only
through ``Job.objects.public()``: a non-public job (draft / closed / suspended /
expired / others' MHA jobs) yields 404, never an existence leak (reusing the Phase 4
visibility gate).

There is deliberately NO employer-facing fit endpoint, NO candidate ranking, and
NO sensitive-trait inference (AGENTS §9, spec §16.1). The required disclaimer
(spec §16.6) is attached to every response so it can never be omitted.
"""

from __future__ import annotations

from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsCandidate
from apps.audit.services import record_action
from apps.candidates.models import CandidateProfile
from apps.jobs.models import Job
from apps.matching import ai
from apps.matching.serializers import JobFitResultSerializer
from apps.matching.services import compute_job_fit


def _public_job_or_none(slug: str) -> Job | None:
    return Job.objects.public().filter(slug=slug).first()


def _own_profile(request: Request) -> CandidateProfile:
    profile, _ = CandidateProfile.objects.get_or_create(user=request.user)
    return profile


def _not_found() -> Response:
    return Response(
        {"code": "not_found", "message": "The requested resource was not found."},
        status=status.HTTP_404_NOT_FOUND,
    )


def _fit_payload(result) -> dict:
    """Serialise a result and always attach the required disclaimer (spec §16.6)."""
    data = JobFitResultSerializer(result).data
    data["disclaimer"] = ai.DISCLAIMER
    return data


class JobFitView(APIView):
    """GET /api/v1/jobs/{slug}/fit/ — the candidate's current fit for the job.

    Computes and caches the result when none exists yet (spec §21.6). 404 if the
    job is not public.
    """

    permission_classes = [IsCandidate]

    def get(self, request: Request, slug: str) -> Response:
        job = _public_job_or_none(slug)
        if job is None:
            return _not_found()

        profile = _own_profile(request)
        result = profile.job_fit_results.filter(job=job).first()
        if result is None:
            result = compute_job_fit(profile, job)
        return Response(_fit_payload(result))


class JobFitRegenerateView(APIView):
    """POST /api/v1/jobs/{slug}/fit/regenerate/ — recompute the fit afresh.

    Used after a resume or preference change. Always recomputes and overwrites the
    single current result, updating ``generated_at`` (spec §20.11). 404 if the job
    is not public.
    """

    permission_classes = [IsCandidate]

    def post(self, request: Request, slug: str) -> Response:
        job = _public_job_or_none(slug)
        if job is None:
            return _not_found()

        profile = _own_profile(request)
        result = compute_job_fit(profile, job)
        record_action(
            actor=request.user,
            action="job_fit.regenerated",
            target=result,
            metadata={"job_id": str(job.id), "score": result.score, "band": result.band},
        )
        return Response(_fit_payload(result))
