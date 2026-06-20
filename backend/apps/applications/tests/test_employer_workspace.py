"""Employer applicant-workspace behaviour + security (spec §14.10, §14.12, §22.1).

The central guarantee under test is employer isolation: an employer may reach
ONLY applicants to their own jobs. Cross-employer and MHA-owned-job access must
404 (no existence leak), private notes must never appear in any candidate
response, the resume snapshot must be reachable only by the owning employer, and
the dashboard counts must be real and scoped.
"""

from __future__ import annotations

import pytest
from django.core.files.base import ContentFile
from django.utils import timezone

from apps.accounts.models import User
from apps.audit.models import AuditLog
from apps.employers.models import EmployerProfile
from apps.jobs.models import Job

from ..models import Application, ApplicationStatus, ApplicationStatusHistory
from .conftest import PASSWORD, VALID_PDF

# --- local fixtures / helpers ---------------------------------------------


@pytest.fixture
def make_employer(db):
    counter = {"n": 0}

    def _make(
        *,
        approval=EmployerProfile.ApprovalStatus.APPROVED,
        account_status=User.Status.ACTIVE,
        email: str | None = None,
    ) -> EmployerProfile:
        counter["n"] += 1
        email = email or f"emp{counter['n']}@example.com"
        user = User.objects.create_user(
            email=email,
            password=PASSWORD,
            role=User.Role.EMPLOYER,
            status=account_status,
        )
        return EmployerProfile.objects.create(
            user=user,
            company_name=f"Synthetic Co {counter['n']}",
            contact_person="Hiring Lead",
            phone="+60198765432",
            approval_status=approval,
        )

    return _make


@pytest.fixture
def employer_job(db):
    def _make(employer, **kwargs) -> Job:
        defaults = {
            "title": "Senior Data Analyst",
            "location": "Kuala Lumpur",
            "employment_type": Job.EmploymentType.FULL_TIME,
            "status": Job.Status.PUBLISHED,
            "published_at": timezone.now(),
            "created_by": employer.user if employer else None,
            "source_type": (
                Job.SourceType.MHA_DIRECT if employer is None else Job.SourceType.EMPLOYER_PARTNER
            ),
        }
        defaults.update(kwargs)
        return Job.objects.create(employer=employer, **defaults)

    return _make


def _apply(candidate, job, *, status=ApplicationStatus.APPLIED) -> Application:
    """Create an application directly (with a snapshot) for test setup."""
    app = Application(
        job=job,
        candidate=candidate,
        cover_letter="Please consider me.",
        status=status,
        resume_snapshot_name="cv.pdf",
    )
    app.resume_file_snapshot.save("cv.pdf", ContentFile(VALID_PDF), save=False)
    app.save()
    ApplicationStatusHistory.objects.create(
        application=app, from_status=None, to_status=status, changed_by=candidate.user
    )
    return app


def _auth(api, user):
    api.force_authenticate(user=user)
    return api


# --- list / isolation ------------------------------------------------------


@pytest.mark.django_db
def test_employer_lists_only_own_job_applicants(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    other = make_employer()
    own_job = employer_job(owner)
    other_job = employer_job(other)
    _apply(make_candidate(email="a@example.com"), own_job)
    _apply(make_candidate(email="b@example.com"), other_job)

    _auth(api, owner.user)
    resp = api.get("/api/v1/employer/applications/")
    assert resp.status_code == 200
    body = resp.json()
    assert body["count"] == 1
    assert body["results"][0]["job"]["id"] == str(own_job.id)


@pytest.mark.django_db
def test_mha_owned_job_applicants_invisible_to_employers(
    api, make_employer, employer_job, make_candidate
):
    employer = make_employer()
    mha_job = employer_job(None)  # MHA-direct, employer is null
    _apply(make_candidate(), mha_job)

    _auth(api, employer.user)
    resp = api.get("/api/v1/employer/applications/")
    assert resp.status_code == 200
    assert resp.json()["count"] == 0


@pytest.mark.django_db
def test_job_scoped_list_404_for_non_owned_job(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    other = make_employer()
    other_job = employer_job(other)
    _apply(make_candidate(), other_job)

    _auth(api, owner.user)
    resp = api.get(f"/api/v1/employer/jobs/{other_job.id}/applications/")
    assert resp.status_code == 404


@pytest.mark.django_db
def test_list_filters_by_job_and_status_and_search(
    api, make_employer, employer_job, make_candidate
):
    owner = make_employer()
    job_a = employer_job(owner, title="Analyst")
    job_b = employer_job(owner, title="Engineer")
    c1 = make_candidate(email="c1@example.com")
    c1.full_name = "Alice Wong"
    c1.save()
    c2 = make_candidate(email="c2@example.com")
    c2.full_name = "Bob Tan"
    c2.save()
    _apply(c1, job_a, status=ApplicationStatus.SHORTLISTED)
    _apply(c2, job_b, status=ApplicationStatus.APPLIED)

    _auth(api, owner.user)
    assert api.get(f"/api/v1/employer/applications/?job={job_a.id}").json()["count"] == 1
    assert api.get("/api/v1/employer/applications/?status=SHORTLISTED").json()["count"] == 1
    assert api.get("/api/v1/employer/applications/?search=alice").json()["count"] == 1


# --- detail ----------------------------------------------------------------


@pytest.mark.django_db
def test_detail_exposes_private_notes_and_profile_to_owner(
    api, make_employer, employer_job, make_candidate
):
    owner = make_employer()
    job = employer_job(owner)
    candidate = make_candidate()
    app = _apply(candidate, job)
    app.employer_private_notes = "Strong SQL, schedule a call"
    app.save()

    _auth(api, owner.user)
    body = api.get(f"/api/v1/employer/applications/{app.id}/").json()
    assert body["employer_private_notes"] == "Strong SQL, schedule a call"
    assert body["candidate"]["full_name"] == candidate.full_name
    assert body["candidate"]["phone"] == candidate.phone
    assert len(body["status_history"]) == 1


@pytest.mark.django_db
def test_detail_404_for_other_employer(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    other = make_employer()
    app = _apply(make_candidate(), employer_job(owner))

    _auth(api, other.user)
    assert api.get(f"/api/v1/employer/applications/{app.id}/").status_code == 404


# --- status change ---------------------------------------------------------


@pytest.mark.django_db
def test_status_change_writes_one_history_row_and_updates(
    api, make_employer, employer_job, make_candidate
):
    owner = make_employer()
    job = employer_job(owner)
    app = _apply(make_candidate(), job)
    before = app.status_history.count()

    _auth(api, owner.user)
    resp = api.patch(
        f"/api/v1/employer/applications/{app.id}/status/",
        {"status": ApplicationStatus.SHORTLISTED, "change_note": "Good fit"},
        format="json",
    )
    assert resp.status_code == 200
    app.refresh_from_db()
    assert app.status == ApplicationStatus.SHORTLISTED
    assert app.status_history.count() == before + 1
    latest = app.status_history.order_by("created_at").last()
    assert latest.from_status == ApplicationStatus.APPLIED
    assert latest.to_status == ApplicationStatus.SHORTLISTED
    assert latest.changed_by_id == owner.user_id
    assert AuditLog.objects.filter(action="application.status_changed").count() == 1


@pytest.mark.django_db
def test_status_change_to_rejected_allowed(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    app = _apply(make_candidate(), employer_job(owner))
    _auth(api, owner.user)
    resp = api.patch(
        f"/api/v1/employer/applications/{app.id}/status/",
        {"status": ApplicationStatus.REJECTED},
        format="json",
    )
    assert resp.status_code == 200
    app.refresh_from_db()
    assert app.status == ApplicationStatus.REJECTED


@pytest.mark.django_db
def test_invalid_status_rejected(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    app = _apply(make_candidate(), employer_job(owner))
    _auth(api, owner.user)
    resp = api.patch(
        f"/api/v1/employer/applications/{app.id}/status/",
        {"status": "TELEPORTED"},
        format="json",
    )
    assert resp.status_code == 400
    app.refresh_from_db()
    assert app.status == ApplicationStatus.APPLIED
    assert app.status_history.count() == 1  # no spurious history row


@pytest.mark.django_db
def test_status_change_404_for_other_employer_no_mutation(
    api, make_employer, employer_job, make_candidate
):
    owner = make_employer()
    other = make_employer()
    app = _apply(make_candidate(), employer_job(owner))
    _auth(api, other.user)
    resp = api.patch(
        f"/api/v1/employer/applications/{app.id}/status/",
        {"status": ApplicationStatus.HIRED},
        format="json",
    )
    assert resp.status_code == 404
    app.refresh_from_db()
    assert app.status == ApplicationStatus.APPLIED


# --- notes -----------------------------------------------------------------


@pytest.mark.django_db
def test_notes_update_persists_and_audited(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    app = _apply(make_candidate(), employer_job(owner))
    _auth(api, owner.user)
    resp = api.patch(
        f"/api/v1/employer/applications/{app.id}/notes/",
        {"employer_private_notes": "Internal only note"},
        format="json",
    )
    assert resp.status_code == 200
    app.refresh_from_db()
    assert app.employer_private_notes == "Internal only note"
    assert AuditLog.objects.filter(action="application.notes_updated").count() == 1


@pytest.mark.django_db
def test_notes_never_visible_to_candidate(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    job = employer_job(owner)
    candidate = make_candidate()
    app = _apply(candidate, job)
    app.employer_private_notes = "secret reviewer note"
    app.save()

    _auth(api, candidate.user)
    body = api.get(f"/api/v1/candidate/applications/{app.id}/").json()
    assert "employer_private_notes" not in body
    assert "secret" not in str(body).lower()


@pytest.mark.django_db
def test_notes_update_404_for_other_employer(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    other = make_employer()
    app = _apply(make_candidate(), employer_job(owner))
    _auth(api, other.user)
    resp = api.patch(
        f"/api/v1/employer/applications/{app.id}/notes/",
        {"employer_private_notes": "hack"},
        format="json",
    )
    assert resp.status_code == 404
    app.refresh_from_db()
    assert app.employer_private_notes == ""


# --- resume download -------------------------------------------------------


@pytest.mark.django_db
def test_owner_can_download_resume_snapshot(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    app = _apply(make_candidate(), employer_job(owner))
    _auth(api, owner.user)
    resp = api.get(f"/api/v1/employer/applications/{app.id}/resume/")
    assert resp.status_code == 200
    assert resp["Content-Disposition"].startswith("attachment")
    assert b"".join(resp.streaming_content) == VALID_PDF
    assert AuditLog.objects.filter(action="resume.downloaded").count() == 1


@pytest.mark.django_db
def test_resume_download_404_for_other_employer(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    other = make_employer()
    app = _apply(make_candidate(), employer_job(owner))
    _auth(api, other.user)
    assert api.get(f"/api/v1/employer/applications/{app.id}/resume/").status_code == 404
    # No download was audited for the denied attempt.
    assert AuditLog.objects.filter(action="resume.downloaded").count() == 0


@pytest.mark.django_db
def test_resume_download_denied_for_anonymous(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    app = _apply(make_candidate(), employer_job(owner))
    resp = api.get(f"/api/v1/employer/applications/{app.id}/resume/")
    assert resp.status_code in (401, 403)


@pytest.mark.django_db
def test_no_public_resume_url_in_any_response(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    app = _apply(make_candidate(), employer_job(owner))
    _auth(api, owner.user)
    detail = api.get(f"/api/v1/employer/applications/{app.id}/")
    body = detail.json()
    serialized = str(body)
    # The opaque storage path is never serialised; only metadata + a boolean flag.
    assert "resume_snapshots/" not in serialized
    assert "resume_file_snapshot" not in body
    assert body["has_resume_snapshot"] is True


# --- dashboard -------------------------------------------------------------


@pytest.mark.django_db
def test_dashboard_counts_are_real_and_scoped(api, make_employer, employer_job, make_candidate):
    owner = make_employer()
    other = make_employer()
    job = employer_job(owner)
    employer_job(owner, status=Job.Status.DRAFT)  # a draft -> attention
    other_job = employer_job(other)
    _apply(make_candidate(email="a@example.com"), job, status=ApplicationStatus.APPLIED)
    _apply(make_candidate(email="b@example.com"), job, status=ApplicationStatus.SHORTLISTED)
    _apply(make_candidate(email="c@example.com"), other_job)  # other employer

    _auth(api, owner.user)
    body = api.get("/api/v1/employer/dashboard/").json()
    assert body["attention"]["new_applicants"] == 1  # only the APPLIED one
    assert body["attention"]["draft_jobs"] == 1
    assert body["pipeline"]["APPLIED"] == 1
    assert body["pipeline"]["SHORTLISTED"] == 1
    assert body["totals"]["applications"] == 2  # other employer's applicant excluded
    # No fabricated views/time-series metric leaks into the payload.
    assert "views" not in str(body).lower()


@pytest.mark.django_db
def test_dashboard_jobs_near_deadline(api, make_employer, employer_job):
    from datetime import timedelta

    owner = make_employer()
    soon = timezone.localdate() + timedelta(days=3)
    far = timezone.localdate() + timedelta(days=60)
    employer_job(owner, application_deadline=soon)
    employer_job(owner, application_deadline=far)

    _auth(api, owner.user)
    body = api.get("/api/v1/employer/dashboard/").json()
    assert body["attention"]["jobs_near_deadline"] == 1


# --- permission boundary ---------------------------------------------------


@pytest.mark.django_db
@pytest.mark.parametrize(
    "approval",
    [EmployerProfile.ApprovalStatus.PENDING, EmployerProfile.ApprovalStatus.REJECTED],
)
def test_unapproved_employer_denied_workspace(api, make_employer, approval):
    employer = make_employer(approval=approval)
    _auth(api, employer.user)
    assert api.get("/api/v1/employer/applications/").status_code == 403
    assert api.get("/api/v1/employer/dashboard/").status_code == 403


@pytest.mark.django_db
def test_suspended_employer_denied_workspace(api, make_employer):
    employer = make_employer(
        approval=EmployerProfile.ApprovalStatus.SUSPENDED,
        account_status=User.Status.SUSPENDED,
    )
    _auth(api, employer.user)
    assert api.get("/api/v1/employer/applications/").status_code == 403


@pytest.mark.django_db
def test_candidate_denied_employer_workspace(api, make_candidate):
    candidate = make_candidate()
    _auth(api, candidate.user)
    assert api.get("/api/v1/employer/applications/").status_code == 403
    assert api.get("/api/v1/employer/dashboard/").status_code == 403
