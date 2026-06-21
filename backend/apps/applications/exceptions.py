"""Application-specific API exceptions."""

from __future__ import annotations

from rest_framework import status
from rest_framework.exceptions import APIException


class DuplicateApplication(APIException):
    """Raised when a candidate applies to a job they already applied to."""

    status_code = status.HTTP_409_CONFLICT
    default_detail = "You have already applied to this job."
    default_code = "conflict"
