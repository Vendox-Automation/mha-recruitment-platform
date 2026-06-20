"""Cross-cutting request middleware."""

from __future__ import annotations

import uuid
from collections.abc import Callable

from django.http import HttpRequest, HttpResponse

REQUEST_ID_HEADER = "X-Request-ID"


class RequestIDMiddleware:
    """Attach a correlation id to every request and echo it in the response.

    The id is surfaced in the normalised API error body (ADR-0001 §7.2) so a
    failing request can be traced in logs.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        incoming = request.headers.get(REQUEST_ID_HEADER)
        request.request_id = incoming or uuid.uuid4().hex
        response = self.get_response(request)
        response[REQUEST_ID_HEADER] = request.request_id
        return response
