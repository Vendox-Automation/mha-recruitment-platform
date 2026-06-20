"""Application routes (mounted under /api/v1/)."""

from __future__ import annotations

from django.urls import path

from .views import (
    ApplyView,
    CandidateApplicationDetailView,
    CandidateApplicationListView,
    JobApplicationStatusView,
)

urlpatterns = [
    path("jobs/<slug:slug>/apply/", ApplyView.as_view(), name="job-apply"),
    path(
        "jobs/<slug:slug>/application/",
        JobApplicationStatusView.as_view(),
        name="job-application-status",
    ),
    path(
        "candidate/applications/",
        CandidateApplicationListView.as_view(),
        name="candidate-applications",
    ),
    path(
        "candidate/applications/<uuid:pk>/",
        CandidateApplicationDetailView.as_view(),
        name="candidate-application-detail",
    ),
]
