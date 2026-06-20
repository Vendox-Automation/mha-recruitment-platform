"""Normalised DRF error responses (ADR-0001 §7.2, spec §21.10).

Every non-2xx API response uses one shape:

    {
      "code": "validation_error",
      "message": "Please review the highlighted fields.",
      "fields": {"email": ["Enter a valid work email address."]},
      "request_id": "..."
    }
"""

from __future__ import annotations

from typing import Any

from django.core.exceptions import PermissionDenied
from django.http import Http404
from rest_framework import exceptions, status
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

# Map DRF exception classes / status codes to stable machine codes.
_STATUS_CODE_MAP = {
    status.HTTP_400_BAD_REQUEST: "validation_error",
    status.HTTP_401_UNAUTHORIZED: "authentication_required",
    status.HTTP_403_FORBIDDEN: "permission_denied",
    status.HTTP_404_NOT_FOUND: "not_found",
    status.HTTP_405_METHOD_NOT_ALLOWED: "method_not_allowed",
    status.HTTP_409_CONFLICT: "conflict",
    status.HTTP_429_TOO_MANY_REQUESTS: "throttled",
}

_DEFAULT_MESSAGES = {
    "validation_error": "Please review the highlighted fields.",
    "authentication_required": "Authentication is required.",
    "permission_denied": "You do not have permission to perform this action.",
    "not_found": "The requested resource was not found.",
    "method_not_allowed": "That method is not allowed here.",
    "conflict": "The request conflicts with the current state.",
    "throttled": "Too many requests. Please try again later.",
    "server_error": "Something went wrong. Please try again.",
}


def _flatten_fields(detail: Any) -> dict[str, list[str]] | None:
    """Convert a DRF validation detail dict into field -> [messages]."""
    if not isinstance(detail, dict):
        return None
    fields: dict[str, list[str]] = {}
    for key, value in detail.items():
        if isinstance(value, list):
            fields[str(key)] = [str(item) for item in value]
        else:
            fields[str(key)] = [str(value)]
    return fields


def api_exception_handler(exc: Exception, context: dict[str, Any]) -> Response | None:
    """DRF exception handler producing the normalised error envelope."""
    # Translate native Django exceptions DRF would otherwise miss.
    if isinstance(exc, Http404):
        exc = exceptions.NotFound()
    elif isinstance(exc, PermissionDenied):
        exc = exceptions.PermissionDenied()

    response = drf_exception_handler(exc, context)
    request = context.get("request")
    request_id = getattr(request, "request_id", None)

    if response is None:
        # Unhandled error: keep details out of the body (spec §22.5).
        return None

    code = _STATUS_CODE_MAP.get(response.status_code, "server_error")
    detail = response.data
    fields = _flatten_fields(detail) if code == "validation_error" else None

    if isinstance(detail, dict) and "detail" in detail:
        message = str(detail["detail"])
    elif fields:
        message = _DEFAULT_MESSAGES["validation_error"]
    else:
        message = _DEFAULT_MESSAGES.get(code, _DEFAULT_MESSAGES["server_error"])

    body: dict[str, Any] = {"code": code, "message": message}
    if fields:
        body["fields"] = fields
    if request_id:
        body["request_id"] = request_id

    response.data = body
    return response
