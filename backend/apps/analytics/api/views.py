"""Analytics API (spec §15.8, §21.8, §21.9).

Two surfaces:

* :class:`PublicInsightsView` — ``AllowAny`` (throttle ``public``). Returns only
  reliable, non-identifying platform aggregates; small-group entries are withheld
  by the selector.
* :class:`EmployerAnalyticsView` — ``IsApprovedEmployer``, strictly scoped to the
  requesting employer's OWN jobs. Never exposes cross-employer or
  individual-candidate data.
"""

from __future__ import annotations

from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.permissions import IsApprovedEmployer
from apps.analytics.selectors.employer_analytics import employer_analytics
from apps.analytics.selectors.public_insights import public_insights


class PublicInsightsView(APIView):
    """GET /api/v1/insights/public/ — reliable, non-identifying aggregates."""

    permission_classes = [AllowAny]
    throttle_scope = "public"

    def get(self, request: Request) -> Response:
        return Response(public_insights())


class EmployerAnalyticsView(APIView):
    """GET /api/v1/employer/analytics/ — the employer's OWN-job analytics."""

    permission_classes = [IsApprovedEmployer]

    def get(self, request: Request) -> Response:
        employer = request.user.employer_profile
        return Response(employer_analytics(employer))
