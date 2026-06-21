"""Analytics routes (spec §21.8, §21.9).

Mounted by ``config.urls``:

* :data:`public_patterns` at ``/api/v1/`` → ``GET /api/v1/insights/public/``.
* :data:`employer_patterns` at ``/api/v1/employer/`` →
  ``GET /api/v1/employer/analytics/``.
"""

from __future__ import annotations

from django.urls import path

from apps.analytics.api.views import EmployerAnalyticsView, PublicInsightsView

app_name = "analytics"

public_patterns = [
    path("insights/public/", PublicInsightsView.as_view(), name="public-insights"),
]

employer_patterns = [
    path("analytics/", EmployerAnalyticsView.as_view(), name="employer-analytics"),
]
