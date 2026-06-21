"""Job + company routes (spec §21.4, §21.7).

Three route groups are mounted from the root urlconf under distinct prefixes:

  * ``employer_router``  -> /api/v1/employer/jobs/...   (owner CRUD + lifecycle)
  * ``public_job_patterns``  -> /api/v1/jobs/...        (AllowAny search/detail)
  * ``company_patterns``     -> /api/v1/companies/...   (AllowAny directory)
"""

from __future__ import annotations

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.jobs.api.employer_views import EmployerJobViewSet
from apps.jobs.api.public_views import (
    PublicCompanyDetailView,
    PublicCompanyListView,
    PublicJobDetailView,
    PublicJobListView,
)

app_name = "jobs"

employer_router = DefaultRouter()
employer_router.register("jobs", EmployerJobViewSet, basename="employer-job")

public_job_patterns = [
    path("", PublicJobListView.as_view(), name="public-job-list"),
    path("<slug:slug>/", PublicJobDetailView.as_view(), name="public-job-detail"),
]

company_patterns = [
    path("", PublicCompanyListView.as_view(), name="company-list"),
    path("<slug:slug>/", PublicCompanyDetailView.as_view(), name="company-detail"),
]
