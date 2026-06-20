"""Health-check and error-envelope smoke tests."""

from __future__ import annotations

import pytest
from rest_framework.test import APIRequestFactory

from config.exceptions import api_exception_handler


@pytest.mark.django_db
def test_health_endpoint_reports_ok(client):
    response = client.get("/api/v1/health/")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert body["database"] == "ok"
    assert body["service"] == "mha-jobs-backend"


def test_health_endpoint_sets_request_id_header(client):
    response = client.get("/api/v1/health/")
    assert response.headers.get("X-Request-ID")


def test_error_envelope_shape_for_not_found():
    from rest_framework.exceptions import NotFound

    factory = APIRequestFactory()
    request = factory.get("/api/v1/missing/")
    request.request_id = "test-req-id"
    response = api_exception_handler(NotFound(), {"request": request})
    assert response is not None
    assert response.data["code"] == "not_found"
    assert response.data["request_id"] == "test-req-id"
    assert "message" in response.data
