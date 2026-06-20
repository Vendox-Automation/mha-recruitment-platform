"""Authentication routes mounted under /api/v1/auth/ (spec §21.1)."""

from __future__ import annotations

from django.urls import path

from apps.accounts.api import views

app_name = "accounts"

urlpatterns = [
    path("register/candidate/", views.CandidateRegisterView.as_view(), name="register-candidate"),
    path("register/employer/", views.EmployerRegisterView.as_view(), name="register-employer"),
    path("login/", views.LoginView.as_view(), name="login"),
    path("logout/", views.LogoutView.as_view(), name="logout"),
    path("csrf/", views.CsrfView.as_view(), name="csrf"),
    path("refresh/", views.RefreshView.as_view(), name="refresh"),
    path("me/", views.MeView.as_view(), name="me"),
    path(
        "password-reset/request/",
        views.PasswordResetRequestView.as_view(),
        name="password-reset-request",
    ),
    path(
        "password-reset/confirm/",
        views.PasswordResetConfirmView.as_view(),
        name="password-reset-confirm",
    ),
    path(
        "verify-email/",
        views.EmailVerificationConfirmView.as_view(),
        name="verify-email",
    ),
]
