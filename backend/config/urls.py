"""Root URL configuration.

Domain app routes are mounted under the versioned `/api/v1/` prefix as each
phase adds them. Phase 0 ships only the health check and Django admin.
"""

from __future__ import annotations

from django.contrib import admin
from django.urls import include, path

from apps.analytics.api import urls as analytics_urls
from apps.jobs.api import urls as jobs_urls
from apps.matching.api import urls as matching_urls
from apps.reviews.api import urls as reviews_urls
from apps.support.api import urls as support_urls
from config.health import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    # In-app administrator console (cross-domain employer approvals). Owned by
    # apps.administration; kept separate from the employers self-service surface.
    path("api/v1/admin/", include("apps.administration.api.urls")),
    path("api/v1/auth/", include("apps.accounts.api.urls")),
    path("api/v1/employer/", include("apps.employers.api.urls")),
    # Employer own-job analytics (views/applications/conversion/etc.). Mounted
    # before the jobs employer router so ``analytics/`` resolves cleanly
    # (apps.analytics owns it, ADR §3.1).
    path("api/v1/employer/", include((analytics_urls.employer_patterns, "analytics-employer"))),
    # Candidate self-service: profile editor, private resume management, the
    # permission-checked resume download, saved jobs, and the candidate's own
    # support-request history (apps.candidates owns the first set, ADR §3.1).
    path("api/v1/candidate/", include("apps.candidates.api.urls")),
    path("api/v1/candidate/", include((support_urls.candidate_patterns, "support-candidate"))),
    # Jobs: employer CRUD/lifecycle, public search/detail, and the public
    # company directory (apps.jobs owns public job + company APIs, ADR §3.1).
    # Employer applicant workspace (applications to the employer's OWN jobs):
    # dashboard, applicant list/detail, status/notes mutations, and the
    # permission-checked resume-snapshot download. Mounted before the jobs router
    # so the literal ``jobs/{id}/applications/`` route resolves unambiguously
    # (apps.applications owns these, ADR §3.1).
    path("api/v1/employer/", include("apps.applications.api.employer_urls")),
    path("api/v1/employer/", include((jobs_urls.employer_router.urls, "jobs"), namespace="jobs")),
    # Smart Job Fit (candidate-only): jobs/{slug}/fit/ and .../fit/regenerate/.
    # Mounted before the public job patterns so the more specific ``fit`` suffixes
    # resolve cleanly ahead of the ``{slug}/`` detail route (apps.matching owns
    # the Job Fit API, ADR §3.1).
    path("api/v1/jobs/", include((matching_urls.job_fit_patterns, "matching"))),
    path("api/v1/jobs/", include((jobs_urls.public_job_patterns, "jobs-public"))),
    # Public company reviews: companies/{slug}/reviews/ (AllowAny list + create).
    # Mounted BEFORE the company directory patterns so the more specific
    # ``{slug}/reviews/`` route resolves ahead of the ``{slug}/`` detail route
    # (apps.reviews owns the review API, ADR §3.1).
    path("api/v1/companies/", include((reviews_urls.company_review_patterns, "reviews"))),
    path("api/v1/companies/", include((jobs_urls.company_patterns, "companies"))),
    # Employer reply to a review of their OWN company.
    path("api/v1/employer/", include((reviews_urls.employer_patterns, "reviews-employer"))),
    # Public career-support intake + permission-checked attachment download, and
    # the public insights aggregate (apps.support / apps.analytics own these).
    path("api/v1/", include((support_urls.public_patterns, "support"))),
    path("api/v1/", include((analytics_urls.public_patterns, "analytics-public"))),
    # Applications: candidate apply (jobs/{slug}/apply/) + candidate tracking
    # (candidate/applications/). Mounted last so the more specific job/candidate
    # patterns above resolve first (apps.applications owns these, ADR §3.1).
    path("api/v1/", include("apps.applications.api.urls")),
]
