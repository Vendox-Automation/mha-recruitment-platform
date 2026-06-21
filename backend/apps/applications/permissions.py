"""Employer-isolation scoping for the applicant workspace (spec §22.1).

Authorisation is authoritative in Django. The single trustworthy gate for the
whole employer applicant surface is the *queryset scope*: every employer-facing
view resolves applications through :func:`employer_applications`, which filters
``application.job.employer == request.user.employer_profile``.

Consequences of scoping (rather than per-object ``has_object_permission``):

  * An application to ANOTHER employer's job is simply not in the queryset, so a
    detail / status / notes / resume lookup resolves to 404 — existence is never
    leaked (no 403-vs-404 oracle).
  * An MHA-owned job has ``employer`` null, so its applications can never match an
    employer profile and are likewise invisible to every employer.

``IsApprovedEmployer`` already guarantees ``request.user.employer_profile`` is a
non-null APPROVED profile before any of these helpers run, but the helpers defend
in depth by returning an empty queryset when no profile is present.
"""

from __future__ import annotations

from django.db.models import QuerySet

from .models import Application


def employer_applications(user) -> QuerySet[Application]:
    """All applications to jobs owned by ``user``'s employer profile.

    This is the ONLY entry point employer views use to reach applications; it is
    the employer-isolation boundary. Returns an empty queryset (never raises)
    when the user has no employer profile, so a caller that forgot the permission
    class still cannot read another tenant's data.
    """
    profile = getattr(user, "employer_profile", None)
    if profile is None:
        return Application.objects.none()
    return Application.objects.filter(job__employer=profile)
