"""Employer routes mounted under /api/v1/employer/ (spec §21.3)."""

from __future__ import annotations

from django.urls import path

from apps.employers.api import views

app_name = "employers"

urlpatterns = [
    path("profile/", views.EmployerProfileView.as_view(), name="profile"),
    path("approval-status/", views.EmployerApprovalStatusView.as_view(), name="approval-status"),
]
