"""Lightweight health-check endpoint used by Phase 0 verification."""

from __future__ import annotations

from django.db import connection
from django.http import HttpRequest, JsonResponse


def health(request: HttpRequest) -> JsonResponse:
    """Return service status and a database connectivity probe."""
    database_ok = True
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
    except Exception:  # pragma: no cover - exercised only on DB outage
        database_ok = False

    payload = {
        "status": "ok" if database_ok else "degraded",
        "service": "mha-jobs-backend",
        "database": "ok" if database_ok else "unavailable",
    }
    return JsonResponse(payload, status=200 if database_ok else 503)
