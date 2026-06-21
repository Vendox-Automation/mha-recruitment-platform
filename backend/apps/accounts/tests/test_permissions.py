"""Object-level boundary tests for the permission classes (spec §11, AGENTS §10).

A sample protected endpoint guarded by ``IsApprovedEmployer`` is exercised
against all six boundaries: anonymous, candidate, pending employer, approved
employer, rejected/suspended employer, and administrator. The other permission
classes are checked directly against built request objects.
"""

from __future__ import annotations

import pytest
from django.urls import path
from rest_framework.response import Response
from rest_framework.test import APIRequestFactory, force_authenticate
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.accounts.permissions import (
    IsActiveAccount,
    IsAdministrator,
    IsApprovedEmployer,
    IsCandidate,
    IsEmployer,
)
from apps.employers.models import EmployerProfile


class _ApprovedEmployerOnlyView(APIView):
    permission_classes = [IsApprovedEmployer]

    def get(self, request):
        return Response({"ok": True})


urlpatterns = [
    path("sample/approved-employer/", _ApprovedEmployerOnlyView.as_view(), name="sample"),
]

SAMPLE_URL = "/sample/approved-employer/"


def _check(view_cls, user):
    """Return the status code of a GET to a permission-guarded view as ``user``."""
    factory = APIRequestFactory()
    request = factory.get("/x/")
    if user is not None:
        force_authenticate(request, user=user)

    class _View(APIView):
        permission_classes = [view_cls]

        def get(self, inner_request):
            return Response({"ok": True})

    return _View.as_view()(request).status_code


# --- IsApprovedEmployer via a real routed endpoint (six boundaries) ---------


@pytest.mark.django_db
@pytest.mark.urls("apps.accounts.tests.test_permissions")
def test_anonymous_denied(api):
    assert api.get(SAMPLE_URL).status_code in (401, 403)


@pytest.mark.django_db
@pytest.mark.urls("apps.accounts.tests.test_permissions")
def test_candidate_denied(api, make_candidate):
    make_candidate(email="b-cand@example.com")
    api.post("/x", {})  # noop
    api.force_authenticate(user=User.objects.get(email="b-cand@example.com"))
    assert api.get(SAMPLE_URL).status_code == 403


@pytest.mark.django_db
@pytest.mark.urls("apps.accounts.tests.test_permissions")
def test_pending_employer_denied(api, make_employer):
    user = make_employer(email="b-pend@example.com")
    api.force_authenticate(user=user)
    assert api.get(SAMPLE_URL).status_code == 403


@pytest.mark.django_db
@pytest.mark.urls("apps.accounts.tests.test_permissions")
def test_approved_employer_allowed(api, make_employer):
    user = make_employer(
        email="b-appr@example.com",
        status=User.Status.ACTIVE,
        approval_status=EmployerProfile.ApprovalStatus.APPROVED,
    )
    api.force_authenticate(user=user)
    assert api.get(SAMPLE_URL).status_code == 200


@pytest.mark.django_db
@pytest.mark.urls("apps.accounts.tests.test_permissions")
def test_rejected_employer_denied(api, make_employer):
    user = make_employer(
        email="b-rej@example.com",
        status=User.Status.ACTIVE,
        approval_status=EmployerProfile.ApprovalStatus.REJECTED,
    )
    api.force_authenticate(user=user)
    assert api.get(SAMPLE_URL).status_code == 403


@pytest.mark.django_db
@pytest.mark.urls("apps.accounts.tests.test_permissions")
def test_suspended_employer_denied(api, make_employer):
    user = make_employer(
        email="b-susp@example.com",
        status=User.Status.SUSPENDED,
        approval_status=EmployerProfile.ApprovalStatus.SUSPENDED,
    )
    api.force_authenticate(user=user)
    assert api.get(SAMPLE_URL).status_code == 403


@pytest.mark.django_db
@pytest.mark.urls("apps.accounts.tests.test_permissions")
def test_administrator_denied_on_employer_endpoint(api, make_admin):
    # Admin is not an approved EMPLOYER, so this employer-only endpoint denies it.
    api.force_authenticate(user=make_admin(email="b-admin@example.com"))
    assert api.get(SAMPLE_URL).status_code == 403


# --- Direct checks for the remaining permission classes ---------------------


@pytest.mark.django_db
def test_iscandidate_allows_only_candidate(make_candidate, make_employer, make_admin):
    assert _check(IsCandidate, make_candidate(email="d-c@example.com")) == 200
    assert _check(IsCandidate, make_employer(email="d-e@example.com")) == 403
    assert _check(IsCandidate, make_admin(email="d-a@example.com")) == 403
    assert _check(IsCandidate, None) in (401, 403)


@pytest.mark.django_db
def test_isemployer_allows_any_employer(make_candidate, make_employer):
    assert _check(IsEmployer, make_employer(email="d-e2@example.com")) == 200
    assert _check(IsEmployer, make_candidate(email="d-c2@example.com")) == 403


@pytest.mark.django_db
def test_isadministrator_allows_only_admin(make_admin, make_candidate):
    assert _check(IsAdministrator, make_admin(email="d-a2@example.com")) == 200
    assert _check(IsAdministrator, make_candidate(email="d-c3@example.com")) == 403


@pytest.mark.django_db
def test_isactiveaccount_rejects_deactivated(make_candidate):
    deactivated = make_candidate(email="d-dead@example.com", status=User.Status.DEACTIVATED)
    assert _check(IsActiveAccount, deactivated) == 403
    active = make_candidate(email="d-alive@example.com")
    assert _check(IsActiveAccount, active) == 200
