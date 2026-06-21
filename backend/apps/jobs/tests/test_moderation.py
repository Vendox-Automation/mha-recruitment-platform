"""Admin moderation service tests: state change + audit + public removal."""

from __future__ import annotations

import pytest
from django.urls import reverse

from apps.audit.models import AuditLog
from apps.jobs.models import Job
from apps.jobs.services import moderation

LIST_URL = reverse("jobs-public:public-job-list")


@pytest.mark.django_db
def test_suspend_removes_from_public_and_audits(make_employer, make_job, make_admin, api):
    e = make_employer()
    admin = make_admin()
    job = make_job(employer=e.employer_profile, title="To suspend", status=Job.Status.PUBLISHED)

    # Visible before moderation.
    assert any(r["title"] == "To suspend" for r in api.get(LIST_URL).data["results"])

    moderation.suspend_job(job, actor=admin, reason="Policy violation")
    job.refresh_from_db()
    assert job.status == Job.Status.SUSPENDED
    assert job.moderation_reason == "Policy violation"

    # Gone from public results.
    assert not any(r["title"] == "To suspend" for r in api.get(LIST_URL).data["results"])

    entry = AuditLog.objects.filter(action="job.suspended").latest("created_at")
    assert entry.actor == admin
    assert entry.target_type == "jobs.Job"
    assert entry.target_id == str(job.pk)


@pytest.mark.django_db
def test_remove_writes_audit_then_deletes(make_employer, make_job, make_admin):
    e = make_employer()
    admin = make_admin()
    job = make_job(employer=e.employer_profile, title="To remove")
    job_id = str(job.pk)

    moderation.remove_job(job, actor=admin)
    assert not Job.objects.filter(pk=job_id).exists()
    entry = AuditLog.objects.filter(action="job.removed").latest("created_at")
    assert entry.target_id == job_id


@pytest.mark.django_db
def test_mark_mha_supported_audits(make_employer, make_job, make_admin):
    e = make_employer()
    admin = make_admin()
    job = make_job(employer=e.employer_profile)
    moderation.set_mha_supported(job, actor=admin, supported=True)
    job.refresh_from_db()
    assert job.is_mha_supported is True
    assert AuditLog.objects.filter(action="job.mha_supported_set").exists()


@pytest.mark.django_db
def test_admin_close_audits(make_employer, make_job, make_admin):
    e = make_employer()
    admin = make_admin()
    job = make_job(employer=e.employer_profile, status=Job.Status.PUBLISHED)
    moderation.admin_close_job(job, actor=admin, reason="Filled externally")
    job.refresh_from_db()
    assert job.status == Job.Status.CLOSED
    assert job.closed_at is not None
    assert AuditLog.objects.filter(action="job.closed_by_admin").exists()
