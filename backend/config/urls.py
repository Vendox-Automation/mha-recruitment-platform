"""Root URL configuration.

Domain app routes are mounted under the versioned `/api/v1/` prefix as each
phase adds them. Phase 0 ships only the health check and Django admin.
"""

from __future__ import annotations

from django.contrib import admin
from django.urls import include, path

from config.health import health

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/health/", health, name="health"),
    path("api/v1/auth/", include("apps.accounts.api.urls")),
    path("api/v1/employer/", include("apps.employers.api.urls")),
]
