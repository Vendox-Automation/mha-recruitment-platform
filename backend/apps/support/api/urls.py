"""Support routes (spec §21.3).

Mounted in two places by ``config.urls`` so each lands at its documented path:

* :data:`public_patterns` at ``/api/v1/`` →
  ``POST /api/v1/support-requests/`` (intake) and
  ``GET  /api/v1/support-requests/{pk}/attachment/`` (permission-checked download).
* :data:`candidate_patterns` at ``/api/v1/candidate/`` →
  ``GET /api/v1/candidate/support-requests/`` (the candidate's own requests).
"""

from __future__ import annotations

from django.urls import path

from apps.support.api.views import (
    CandidateSupportRequestListView,
    SupportAttachmentDownloadView,
    SupportRequestCreateView,
)

app_name = "support"

public_patterns = [
    path("support-requests/", SupportRequestCreateView.as_view(), name="create"),
    path(
        "support-requests/<uuid:pk>/attachment/",
        SupportAttachmentDownloadView.as_view(),
        name="attachment-download",
    ),
]

candidate_patterns = [
    path("support-requests/", CandidateSupportRequestListView.as_view(), name="candidate-list"),
]
