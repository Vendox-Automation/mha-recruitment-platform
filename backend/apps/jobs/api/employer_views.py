"""Employer job management API (spec §14.11, §21.4, §22.1).

Object scoping is structural and authoritative: every queryset is scoped to
``request.user.employer_profile`` via :meth:`get_queryset`, so an employer can
only ever read, edit, or transition their OWN jobs. A job belonging to another
employer — or an MHA-owned job (``employer`` null) — is simply not in the
queryset and resolves to 404, never leaking existence or allowing mutation.

``IsApprovedEmployer`` gates the whole surface: a pending / rejected / suspended
employer cannot create or manage jobs. Lifecycle transitions go through the
lifecycle service, never by PATCHing ``status`` directly.
"""

from __future__ import annotations

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from apps.accounts.permissions import IsApprovedEmployer
from apps.jobs.models import Job
from apps.jobs.serializers import EmployerJobSerializer
from apps.jobs.services import lifecycle


class EmployerJobViewSet(viewsets.ModelViewSet):
    """CRUD + lifecycle for the signed-in employer's own jobs.

    Routes: list/create (``/employer/jobs/``), retrieve/partial-update
    (``/employer/jobs/{id}/``), and the ``publish`` / ``close`` / ``reopen``
    POST sub-actions. Full update (PUT) and delete are not exposed — employers
    edit via PATCH and never hard-delete (admin moderation owns removal).
    """

    serializer_class = EmployerJobSerializer
    permission_classes = [IsApprovedEmployer]
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        profile = getattr(self.request.user, "employer_profile", None)
        if profile is None:
            return Job.objects.none()
        return (
            Job.objects.for_employer(profile)
            .prefetch_related("screening_questions")
            .order_by("-created_at")
        )

    def perform_create(self, serializer) -> None:
        profile = self.request.user.employer_profile
        # Server owns these fields; the serializer never accepts them.
        serializer.save(
            employer=profile,
            created_by=self.request.user,
            source_type=Job.SourceType.EMPLOYER_PARTNER,
            status=Job.Status.DRAFT,
        )

    def update(self, request, *args, **kwargs):
        # ModelViewSet routes PATCH here (partial=True set by partial_update).
        job = self.get_object()
        if job.status == Job.Status.SUSPENDED:
            raise ValidationError(
                {"detail": "This job is suspended by an administrator and cannot be edited."}
            )
        return super().update(request, *args, **kwargs)

    # --- Lifecycle sub-actions --------------------------------------------

    def _transition(self, request, fn):
        job = self.get_object()
        try:
            fn(job)
        except lifecycle.IllegalJobTransition as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        serializer = self.get_serializer(job)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["post"])
    def publish(self, request, pk=None):
        return self._transition(request, lifecycle.publish_job)

    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        return self._transition(request, lifecycle.close_job)

    @action(detail=True, methods=["post"])
    def reopen(self, request, pk=None):
        return self._transition(request, lifecycle.reopen_job)
