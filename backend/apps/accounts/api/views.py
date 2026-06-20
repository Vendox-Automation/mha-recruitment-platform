"""Authentication views (spec §21.1, ADR-0001 §4).

Session-cookie based. No long-lived token is ever returned in a response body
(ADR-0001 §4.1, AGENTS §11). Views stay thin: validation lives in serializers,
multi-record creation in services. ``django.contrib.auth.login`` rotates the
session key on authentication (session rotation, AGENTS §11).
"""

from __future__ import annotations

from django.contrib.auth import login as auth_login
from django.contrib.auth import logout as auth_logout
from django.contrib.auth.tokens import default_token_generator
from django.middleware.csrf import get_token
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotAuthenticated
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.serializers import (
    CandidateRegistrationSerializer,
    EmailVerificationConfirmSerializer,
    EmployerRegistrationSerializer,
    LoginSerializer,
    MeSerializer,
    MeUpdateSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
)
from apps.accounts.services.email_service import send_password_reset
from apps.accounts.services.registration_service import (
    register_candidate,
    register_employer,
)
from apps.accounts.tokens import email_verification_token_generator


def _me_response(request: Request, user: User, http_status: int = status.HTTP_200_OK) -> Response:
    """Return the canonical me-payload and ensure a CSRF cookie is primed."""
    get_token(request)  # ensures the csrftoken cookie is set on the response
    return Response(MeSerializer(user, context={"request": request}).data, status=http_status)


class CandidateRegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def post(self, request: Request) -> Response:
        serializer = CandidateRegistrationSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = register_candidate(**serializer.validated_data)
        auth_login(request, user)  # rotates session
        return _me_response(request, user, status.HTTP_201_CREATED)


class EmployerRegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "register"

    def post(self, request: Request) -> Response:
        serializer = EmployerRegistrationSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = register_employer(**serializer.validated_data)
        auth_login(request, user)
        return _me_response(request, user, status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request: Request) -> Response:
        serializer = LoginSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        auth_login(request, user)  # rotates session
        return _me_response(request, user)


class LogoutView(APIView):
    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        auth_logout(request)  # flushes the session server-side
        return Response(status=status.HTTP_204_NO_CONTENT)


class CsrfView(APIView):
    """Prime the csrftoken cookie (ADR-0001 §4.1)."""

    permission_classes = [AllowAny]

    def get(self, request: Request) -> Response:
        get_token(request)
        return Response({"detail": "ok"})


class RefreshView(APIView):
    """Repurposed under session auth (ADR-0001 §4.1).

    There is no token to refresh: revalidate the session, refresh the CSRF
    cookie, and return the me-payload. MUST NOT mint any long-lived token.
    """

    permission_classes = [AllowAny]

    def post(self, request: Request) -> Response:
        if not request.user.is_authenticated:
            get_token(request)
            return Response({"detail": "No active session."}, status=status.HTTP_401_UNAUTHORIZED)
        return _me_response(request, request.user)


class MeView(APIView):
    """Current user (GET) and safe self-update (PATCH).

    Returns 401 (not DRF's default 403) for anonymous callers: under session
    auth there is no ``WWW-Authenticate`` challenge, so we raise
    ``NotAuthenticated`` explicitly to surface the correct ``authentication_required``
    envelope (ADR-0001 §7.2).
    """

    permission_classes = [AllowAny]

    def get_authenticate_header(self, request: Request) -> str:
        # Force DRF to keep NotAuthenticated as 401 (it falls back to 403 when
        # this returns None, which is the SessionAuthentication default).
        return "Session"

    def _require_user(self, request: Request) -> None:
        if not request.user.is_authenticated:
            raise NotAuthenticated()

    def get(self, request: Request) -> Response:
        self._require_user(request)
        return _me_response(request, request.user)

    def patch(self, request: Request) -> Response:
        self._require_user(request)
        serializer = MeUpdateSerializer(
            instance=request.user, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user.refresh_from_db()
        return _me_response(request, user)


class PasswordResetRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"].strip().lower()
        # Do not reveal whether an account exists (always 200).
        user = User.objects.filter(email__iexact=email).first()
        if user is not None and user.status != User.Status.DEACTIVATED:
            send_password_reset(user)
        return Response({"detail": "If that email is registered, a reset link has been sent."})


class PasswordResetConfirmView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "password_reset"

    def post(self, request: Request) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password", "updated_at"])
        return Response({"detail": "Your password has been reset."})


class EmailVerificationConfirmView(APIView):
    permission_classes = [AllowAny]

    def _verify(self, request: Request) -> Response:
        data = request.data if request.method == "POST" else request.query_params
        serializer = EmailVerificationConfirmSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        if user.email_verified_at is None:
            user.email_verified_at = timezone.now()
            user.save(update_fields=["email_verified_at", "updated_at"])
        return Response({"detail": "Email verified."})

    def get(self, request: Request) -> Response:
        return self._verify(request)

    def post(self, request: Request) -> Response:
        return self._verify(request)


# Re-export for callers/tests that reference the default reset generator.
__all__ = [
    "CandidateRegisterView",
    "EmployerRegisterView",
    "LoginView",
    "LogoutView",
    "CsrfView",
    "RefreshView",
    "MeView",
    "PasswordResetRequestView",
    "PasswordResetConfirmView",
    "EmailVerificationConfirmView",
    "default_token_generator",
    "email_verification_token_generator",
]
