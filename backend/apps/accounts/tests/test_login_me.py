"""Login, logout, me, and refresh behaviour (spec §21.1)."""

from __future__ import annotations

import pytest

from apps.accounts.models import User

from .conftest import PASSWORD

LOGIN_URL = "/api/v1/auth/login/"
ME_URL = "/api/v1/auth/me/"
LOGOUT_URL = "/api/v1/auth/logout/"
REFRESH_URL = "/api/v1/auth/refresh/"


def _login(api, email):
    return api.post(LOGIN_URL, {"email": email, "password": PASSWORD}, format="json")


@pytest.mark.django_db
def test_login_success_returns_me_payload(api, make_candidate):
    make_candidate(email="login@example.com")
    response = _login(api, "login@example.com")
    assert response.status_code == 200
    body = response.json()
    assert body["email"] == "login@example.com"
    assert body["role"] == User.Role.CANDIDATE
    assert response.cookies.get("sessionid")


@pytest.mark.django_db
def test_login_wrong_password_fails(api, make_candidate):
    make_candidate(email="login@example.com")
    response = api.post(
        LOGIN_URL, {"email": "login@example.com", "password": "wrong"}, format="json"
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_deactivated_account_cannot_login(api, make_candidate):
    make_candidate(email="dead@example.com", status=User.Status.DEACTIVATED)
    response = _login(api, "dead@example.com")
    assert response.status_code == 400


@pytest.mark.django_db
def test_suspended_and_pending_can_sign_in(api, make_employer):
    make_employer(email="suspended@example.com", status=User.Status.SUSPENDED)
    response = _login(api, "suspended@example.com")
    assert response.status_code == 200
    assert response.json()["status"] == User.Status.SUSPENDED


@pytest.mark.django_db
def test_me_requires_authentication(api):
    response = api.get(ME_URL)
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_payload_for_candidate(api, make_candidate):
    make_candidate(email="me-c@example.com")
    _login(api, "me-c@example.com")
    body = api.get(ME_URL).json()
    assert body["role"] == User.Role.CANDIDATE
    assert "has_resume" in body["profile"]
    assert "profile_completion" in body["profile"]


@pytest.mark.django_db
def test_me_payload_for_employer(api, make_employer):
    make_employer(email="me-e@example.com")
    _login(api, "me-e@example.com")
    body = api.get(ME_URL).json()
    assert body["role"] == User.Role.EMPLOYER
    assert body["profile"]["company_name"] == "Synthetic Co"
    assert body["profile"]["approval_status"]


@pytest.mark.django_db
def test_me_payload_for_admin(api, make_admin):
    make_admin(email="me-a@example.com")
    _login(api, "me-a@example.com")
    body = api.get(ME_URL).json()
    assert body["role"] == User.Role.ADMIN
    assert body["profile"] is None


@pytest.mark.django_db
def test_logout_flushes_session(api, make_candidate):
    make_candidate(email="logout@example.com")
    _login(api, "logout@example.com")
    csrf = api.cookies["csrftoken"].value
    response = api.post(LOGOUT_URL, HTTP_X_CSRFTOKEN=csrf)
    assert response.status_code == 204
    assert api.get(ME_URL).status_code == 401


@pytest.mark.django_db
def test_refresh_revalidates_session(api, make_candidate):
    make_candidate(email="refresh@example.com")
    _login(api, "refresh@example.com")
    csrf = api.cookies["csrftoken"].value
    response = api.post(REFRESH_URL, HTTP_X_CSRFTOKEN=csrf)
    assert response.status_code == 200
    assert response.json()["email"] == "refresh@example.com"


@pytest.mark.django_db
def test_refresh_anonymous_returns_401(api):
    response = api.post(REFRESH_URL)
    assert response.status_code == 401


@pytest.mark.django_db
def test_me_patch_updates_locale(api, make_candidate):
    make_candidate(email="patch@example.com")
    _login(api, "patch@example.com")
    csrf = api.cookies["csrftoken"].value
    response = api.patch(
        ME_URL,
        {"preferred_locale": "zh-CN", "full_name": "Updated Name"},
        format="json",
        HTTP_X_CSRFTOKEN=csrf,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["preferred_locale"] == "zh-CN"
    assert body["profile"]["full_name"] == "Updated Name"
