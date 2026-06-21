"""Password-reset and email-verification flows (spec §11, §15.2)."""

from __future__ import annotations

import pytest
from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.utils.http import urlsafe_base64_encode

from apps.accounts.tokens import email_verification_token_generator

from .conftest import PASSWORD

RESET_REQ = "/api/v1/auth/password-reset/request/"
RESET_CONFIRM = "/api/v1/auth/password-reset/confirm/"
VERIFY = "/api/v1/auth/verify-email/"
NEW_PASSWORD = "Brand-New-Pass-7766"


def _uid(user):
    return urlsafe_base64_encode(str(user.pk).encode())


@pytest.mark.django_db
def test_password_reset_request_sends_email(api, make_candidate):
    make_candidate(email="reset@example.com")
    response = api.post(RESET_REQ, {"email": "reset@example.com"}, format="json")
    assert response.status_code == 200
    assert len(mail.outbox) == 1


@pytest.mark.django_db
def test_password_reset_request_unknown_email_still_200(api):
    response = api.post(RESET_REQ, {"email": "ghost@example.com"}, format="json")
    assert response.status_code == 200  # does not reveal existence
    assert len(mail.outbox) == 0


@pytest.mark.django_db
def test_password_reset_confirm_happy_path(api, make_candidate):
    user = make_candidate(email="confirm@example.com")
    token = default_token_generator.make_token(user)
    response = api.post(
        RESET_CONFIRM,
        {"uid": _uid(user), "token": token, "new_password": NEW_PASSWORD},
        format="json",
    )
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.check_password(NEW_PASSWORD)


@pytest.mark.django_db
def test_password_reset_confirm_invalid_token(api, make_candidate):
    user = make_candidate(email="badtoken@example.com")
    response = api.post(
        RESET_CONFIRM,
        {"uid": _uid(user), "token": "invalid-token", "new_password": NEW_PASSWORD},
        format="json",
    )
    assert response.status_code == 400
    user.refresh_from_db()
    assert user.check_password(PASSWORD)  # unchanged


@pytest.mark.django_db
def test_password_reset_confirm_weak_password(api, make_candidate):
    user = make_candidate(email="weakreset@example.com")
    token = default_token_generator.make_token(user)
    response = api.post(
        RESET_CONFIRM,
        {"uid": _uid(user), "token": token, "new_password": "123"},
        format="json",
    )
    assert response.status_code == 400
    assert "new_password" in response.json()["fields"]


@pytest.mark.django_db
def test_email_verification_sets_timestamp(api, make_candidate):
    user = make_candidate(email="verify@example.com")
    assert user.email_verified_at is None
    token = email_verification_token_generator.make_token(user)
    response = api.post(VERIFY, {"uid": _uid(user), "token": token}, format="json")
    assert response.status_code == 200
    user.refresh_from_db()
    assert user.email_verified_at is not None


@pytest.mark.django_db
def test_email_verification_invalid_token(api, make_candidate):
    user = make_candidate(email="badverify@example.com")
    response = api.post(VERIFY, {"uid": _uid(user), "token": "nope"}, format="json")
    assert response.status_code == 400
    user.refresh_from_db()
    assert user.email_verified_at is None
