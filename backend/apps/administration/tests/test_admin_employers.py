"""Admin employer-approval API behaviour + authorisation (scope addition).

Two guarantees dominate here:

1. Authorisation is authoritative and exhaustive — every endpoint rejects
   candidates, pending employers, approved employers (403) and anonymous
   callers (401/403 under session-only auth), and admits only administrators.
   This is the object-level / role boundary the spec requires us to test.
2. State transitions go through the approval service, so each successful action
   leaves the employer in the right status AND writes exactly one audit entry,
   while illegal transitions surface as 400 (never a 500).
"""

from __future__ import annotations

import pytest
from rest_framework import status

from apps.audit.models import AuditLog
from apps.employers.models import EmployerProfile

AS = EmployerProfile.ApprovalStatus

pytestmark = pytest.mark.django_db


# --- URL helpers -----------------------------------------------------------

SUMMARY = "/api/v1/admin/summary/"
LIST = "/api/v1/admin/employers/"


def detail(emp):
    return f"/api/v1/admin/employers/{emp.pk}/"


def approve(emp):
    return f"/api/v1/admin/employers/{emp.pk}/approve/"


def reject(emp):
    return f"/api/v1/admin/employers/{emp.pk}/reject/"


def suspend(emp):
    return f"/api/v1/admin/employers/{emp.pk}/suspend/"


def restore(emp):
    return f"/api/v1/admin/employers/{emp.pk}/restore/"


# --- Authorisation boundaries ---------------------------------------------


def _all_endpoints(emp):
    """(method, url) for every endpoint, using a real employer for id paths."""
    return [
        ("get", SUMMARY),
        ("get", LIST),
        ("get", detail(emp)),
        ("post", approve(emp)),
        ("post", reject(emp)),
        ("post", suspend(emp)),
        ("post", restore(emp)),
    ]


def test_anonymous_denied_everywhere(api, make_employer):
    emp = make_employer()
    # Project transport is session-only auth: with no auth challenge, DRF returns
    # 403 (not 401) for an unauthenticated request. The whole suite accepts either
    # here (every other anonymous test asserts `in (401, 403)`), so we match that
    # convention rather than forcing a 401 the session stack cannot produce.
    for method, url in _all_endpoints(emp):
        resp = getattr(api, method)(url, {}, format="json")
        assert resp.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        ), (method, url)
        assert resp.data["code"] in ("authentication_required", "permission_denied")


@pytest.mark.parametrize("role", ["candidate", "approved_employer", "pending_employer"])
def test_non_admin_authenticated_denied_everywhere(api, make_employer, make_candidate, role):
    emp = make_employer()
    if role == "candidate":
        user = make_candidate()
    elif role == "approved_employer":
        user = make_employer(approval_status=AS.APPROVED).user
    else:
        user = make_employer(approval_status=AS.PENDING).user

    api.force_authenticate(user=user)
    for method, url in _all_endpoints(emp):
        resp = getattr(api, method)(url, {}, format="json")
        assert resp.status_code == status.HTTP_403_FORBIDDEN, (role, method, url)
        assert resp.data["code"] == "permission_denied"


def test_admin_allowed_on_reads(api, make_admin, make_employer):
    make_employer()
    api.force_authenticate(user=make_admin())
    assert api.get(SUMMARY).status_code == status.HTTP_200_OK
    assert api.get(LIST).status_code == status.HTTP_200_OK


def test_unknown_id_returns_404(api, make_admin, make_employer):
    api.force_authenticate(user=make_admin())
    missing = "/api/v1/admin/employers/999999/"
    assert api.get(missing).status_code == status.HTTP_404_NOT_FOUND
    assert api.post(missing + "approve/", {}, format="json").status_code == (
        status.HTTP_404_NOT_FOUND
    )


# --- Approve ---------------------------------------------------------------


def test_approve_pending(api, make_admin, make_employer):
    emp = make_employer(approval_status=AS.PENDING)
    api.force_authenticate(user=make_admin())

    before = AuditLog.objects.filter(action="employer.approved").count()
    resp = api.post(approve(emp), {}, format="json")

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["approval_status"] == AS.APPROVED
    emp.refresh_from_db()
    assert emp.approval_status == AS.APPROVED
    assert AuditLog.objects.filter(action="employer.approved").count() == before + 1


def test_approve_already_approved_is_400_not_500(api, make_admin, make_employer):
    emp = make_employer(approval_status=AS.APPROVED)
    api.force_authenticate(user=make_admin())

    resp = api.post(approve(emp), {}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["code"] == "validation_error"


# --- Reject ----------------------------------------------------------------


def test_reject_without_reason_is_field_error(api, make_admin, make_employer):
    emp = make_employer(approval_status=AS.PENDING)
    api.force_authenticate(user=make_admin())

    resp = api.post(reject(emp), {}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["code"] == "validation_error"
    assert "reason" in resp.data["fields"]
    emp.refresh_from_db()
    assert emp.approval_status == AS.PENDING


def test_reject_with_blank_reason_is_field_error(api, make_admin, make_employer):
    emp = make_employer(approval_status=AS.PENDING)
    api.force_authenticate(user=make_admin())

    resp = api.post(reject(emp), {"reason": "   "}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert "reason" in resp.data["fields"]


def test_reject_with_reason_stores_reason(api, make_admin, make_employer):
    emp = make_employer(approval_status=AS.PENDING)
    api.force_authenticate(user=make_admin())

    resp = api.post(reject(emp), {"reason": "Incomplete company details."}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["approval_status"] == AS.REJECTED
    assert resp.data["approval_reason"] == "Incomplete company details."
    emp.refresh_from_db()
    assert emp.approval_status == AS.REJECTED
    assert emp.approval_reason == "Incomplete company details."


# --- Suspend / restore -----------------------------------------------------


def test_suspend_approved(api, make_admin, make_employer):
    emp = make_employer(approval_status=AS.APPROVED)
    api.force_authenticate(user=make_admin())

    resp = api.post(suspend(emp), {}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["approval_status"] == AS.SUSPENDED
    emp.refresh_from_db()
    assert emp.approval_status == AS.SUSPENDED


def test_suspend_pending_is_400_not_500(api, make_admin, make_employer):
    emp = make_employer(approval_status=AS.PENDING)
    api.force_authenticate(user=make_admin())

    resp = api.post(suspend(emp), {}, format="json")
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["code"] == "validation_error"


def test_restore_suspended(api, make_admin, make_employer):
    emp = make_employer(approval_status=AS.SUSPENDED)
    api.force_authenticate(user=make_admin())

    resp = api.post(restore(emp), {}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["approval_status"] == AS.APPROVED
    emp.refresh_from_db()
    assert emp.approval_status == AS.APPROVED


# --- Summary ---------------------------------------------------------------


def test_summary_counts_reflect_seeded_states(api, make_admin, make_employer):
    make_employer(approval_status=AS.PENDING)
    make_employer(approval_status=AS.PENDING)
    make_employer(approval_status=AS.APPROVED)
    make_employer(approval_status=AS.SUSPENDED)
    make_employer(approval_status=AS.REJECTED)
    api.force_authenticate(user=make_admin())

    resp = api.get(SUMMARY)
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data == {
        "pending_employers": 2,
        "approved_employers": 1,
        "suspended_employers": 1,
        "rejected_employers": 1,
        "total_employers": 5,
    }


# --- List filter + search --------------------------------------------------


def test_list_filter_by_status(api, make_admin, make_employer):
    make_employer(approval_status=AS.PENDING, company_name="Pending Co")
    make_employer(approval_status=AS.APPROVED, company_name="Approved Co")
    api.force_authenticate(user=make_admin())

    resp = api.get(LIST, {"status": "PENDING"})
    assert resp.status_code == status.HTTP_200_OK
    names = [row["company_name"] for row in resp.data["results"]]
    assert names == ["Pending Co"]


def test_list_search_by_company_and_email(api, make_admin, make_employer):
    make_employer(company_name="Acme Analytics", email="hello@acme.example.com")
    make_employer(company_name="Globex Corp", email="ops@globex.example.com")
    api.force_authenticate(user=make_admin())

    by_company = api.get(LIST, {"search": "acme"})
    assert [r["company_name"] for r in by_company.data["results"]] == ["Acme Analytics"]

    by_email = api.get(LIST, {"search": "globex.example"})
    assert [r["company_name"] for r in by_email.data["results"]] == ["Globex Corp"]


def test_list_search_by_contact_person(api, make_admin, make_employer):
    make_employer(company_name="One", contact_person="Alice Tan")
    make_employer(company_name="Two", contact_person="Bob Lee")
    api.force_authenticate(user=make_admin())

    resp = api.get(LIST, {"search": "Alice"})
    assert [r["company_name"] for r in resp.data["results"]] == ["One"]


def test_list_orders_pending_first(api, make_admin, make_employer):
    make_employer(approval_status=AS.APPROVED, company_name="Approved Co")
    make_employer(approval_status=AS.PENDING, company_name="Pending Co")
    api.force_authenticate(user=make_admin())

    resp = api.get(LIST)
    names = [row["company_name"] for row in resp.data["results"]]
    assert names[0] == "Pending Co"


def test_detail_exposes_extra_fields(api, make_admin, make_employer):
    emp = make_employer(
        approval_status=AS.PENDING,
        website="https://example.com",
        company_summary="We do synthetic things.",
        company_size="11-50",
    )
    api.force_authenticate(user=make_admin())

    resp = api.get(detail(emp))
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["website"] == "https://example.com"
    assert resp.data["company_summary"] == "We do synthetic things."
    assert resp.data["company_size"] == "11-50"
    assert resp.data["approved_by_email"] is None
    assert resp.data["approval_reason"] == ""
