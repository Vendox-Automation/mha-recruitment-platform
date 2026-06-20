"""Employer applicant-workspace routes (mounted under /api/v1/employer/).

Kept separate from the candidate-facing ``urls.py`` so the two surfaces never
share serializers or views (the candidate surface must never expose employer
private notes or another candidate's data).
"""

from __future__ import annotations

from django.urls import path

from .employer_views import (
    EmployerApplicationDetailView,
    EmployerApplicationListView,
    EmployerApplicationNotesView,
    EmployerApplicationResumeView,
    EmployerApplicationStatusView,
    EmployerDashboardView,
    EmployerJobApplicationListView,
)

app_name = "applications_employer"

urlpatterns = [
    path("dashboard/", EmployerDashboardView.as_view(), name="dashboard"),
    path(
        "applications/",
        EmployerApplicationListView.as_view(),
        name="application-list",
    ),
    path(
        "applications/<uuid:pk>/",
        EmployerApplicationDetailView.as_view(),
        name="application-detail",
    ),
    path(
        "applications/<uuid:pk>/status/",
        EmployerApplicationStatusView.as_view(),
        name="application-status",
    ),
    path(
        "applications/<uuid:pk>/notes/",
        EmployerApplicationNotesView.as_view(),
        name="application-notes",
    ),
    path(
        "applications/<uuid:pk>/resume/",
        EmployerApplicationResumeView.as_view(),
        name="application-resume",
    ),
    path(
        "jobs/<uuid:job_id>/applications/",
        EmployerJobApplicationListView.as_view(),
        name="job-application-list",
    ),
]
