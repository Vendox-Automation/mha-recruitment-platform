"""Admin routes mounted under /api/v1/admin/ (scope addition: in-app admin UI).

Every route requires ``IsAdministrator`` (declared on the views). The employer
id in the action/detail paths is the ``EmployerProfile`` integer primary key
(``<int:id>``); the model uses ``BigAutoField``, not a UUID.
"""

from __future__ import annotations

from django.urls import path

from . import views

app_name = "administration"

urlpatterns = [
    path("summary/", views.AdminSummaryView.as_view(), name="summary"),
    path("employers/", views.AdminEmployerListView.as_view(), name="employer-list"),
    path(
        "employers/<int:id>/",
        views.AdminEmployerDetailView.as_view(),
        name="employer-detail",
    ),
    path(
        "employers/<int:id>/approve/",
        views.AdminEmployerApproveView.as_view(),
        name="employer-approve",
    ),
    path(
        "employers/<int:id>/reject/",
        views.AdminEmployerRejectView.as_view(),
        name="employer-reject",
    ),
    path(
        "employers/<int:id>/suspend/",
        views.AdminEmployerSuspendView.as_view(),
        name="employer-suspend",
    ),
    path(
        "employers/<int:id>/restore/",
        views.AdminEmployerRestoreView.as_view(),
        name="employer-restore",
    ),
]
