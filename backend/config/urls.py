"""Root URL configuration.

Domain app routes are mounted under the versioned `/api/v1/` prefix as each
phase adds them. Phase 0 ships only the health check and Django admin.
"""

from __future__ import annotations

from django.contrib import admin
from django.urls import include, path

from apps.jobs.api import urls as jobs_urls
from config.health import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/auth/", include("apps.accounts.api.urls")),
    path("api/v1/employer/", include("apps.employers.api.urls")),
    # Candidate self-service: profile editor, private resume management, and the
    # permission-checked resume download (apps.candidates owns these, ADR §3.1).
    path("api/v1/candidate/", include("apps.candidates.api.urls")),
    # Jobs: employer CRUD/lifecycle, public search/detail, and the public
    # company directory (apps.jobs owns public job + company APIs, ADR §3.1).
    path("api/v1/employer/", include((jobs_urls.employer_router.urls, "jobs"), namespace="jobs")),
    path("api/v1/jobs/", include((jobs_urls.public_job_patterns, "jobs-public"))),
    path("api/v1/companies/", include((jobs_urls.company_patterns, "companies"))),
]
