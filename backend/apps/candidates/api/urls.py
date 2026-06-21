"""Candidate self-service routes, mounted at ``/api/v1/candidate/`` (spec §21.2).

All routes are owner-scoped (no id/lookup params) and gated by ``IsCandidate``.
The resume download is a distinct path because it is the sole, permission-checked
retrieval seam for private resume bytes (ADR-0001 §5).
"""

from __future__ import annotations

from django.urls import path

from apps.candidates.api.views import (
    CandidateDashboardView,
    CandidateProfileView,
    ResumeDownloadView,
    ResumeView,
    SavedJobDetailView,
    SavedJobsView,
)

app_name = "candidates"

urlpatterns = [
    path("profile/", CandidateProfileView.as_view(), name="profile"),
    path("resume/", ResumeView.as_view(), name="resume"),
    path("resume/download/", ResumeDownloadView.as_view(), name="resume-download"),
    path("dashboard/", CandidateDashboardView.as_view(), name="dashboard"),
    path("saved-jobs/", SavedJobsView.as_view(), name="saved-jobs"),
    path("saved-jobs/<uuid:job_id>/", SavedJobDetailView.as_view(), name="saved-job-detail"),
]
