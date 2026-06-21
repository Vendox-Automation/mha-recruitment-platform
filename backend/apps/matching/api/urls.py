"""Job Fit routes (spec §21.6).

Mounted under ``/api/v1/jobs/`` so the public-facing patterns become::

    GET  /api/v1/jobs/{slug}/fit/
    POST /api/v1/jobs/{slug}/fit/regenerate/

Lookup is by ``slug`` (non-enumerable, consistent with public job detail,
ADR-0001 §7.4). Both endpoints are candidate-only; there is no employer variant.
"""

from __future__ import annotations

from django.urls import path

from apps.matching.api.views import JobFitRegenerateView, JobFitView

app_name = "matching"

job_fit_patterns = [
    path("<slug:slug>/fit/", JobFitView.as_view(), name="job-fit"),
    path(
        "<slug:slug>/fit/regenerate/",
        JobFitRegenerateView.as_view(),
        name="job-fit-regenerate",
    ),
]
