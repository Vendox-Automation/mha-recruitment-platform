"""Company-review routes (product scope addition).

Two route groups are mounted from the root urlconf under distinct prefixes:

* :data:`company_review_patterns` -> /api/v1/companies/{slug}/reviews/
  (AllowAny list + public create).
* :data:`employer_patterns` -> /api/v1/employer/reviews/{review_id}/reply/
  (IsApprovedEmployer create-or-update + delete of the OWN company's reply).

The admin review surface lives in ``apps.administration`` (mounted under
/api/v1/admin/), consistent with the existing admin employer-approval endpoints.
"""

from __future__ import annotations

from django.urls import path

from apps.reviews.api.employer_views import EmployerReviewReplyView
from apps.reviews.api.public_views import PublicCompanyReviewView

app_name = "reviews"

company_review_patterns = [
    path("<slug:slug>/reviews/", PublicCompanyReviewView.as_view(), name="company-reviews"),
]

employer_patterns = [
    path(
        "reviews/<int:review_id>/reply/",
        EmployerReviewReplyView.as_view(),
        name="employer-review-reply",
    ),
]
