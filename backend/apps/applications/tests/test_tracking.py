"""Candidate tracking: own-only access, private-note hiding, snapshot immutability."""

from __future__ import annotations

import pytest
from django.core.files.base import ContentFile

from ..models import Application, ApplicationStatus, ApplicationStatusHistory


def _apply(api, job):
    return api.post(f"/api/v1/jobs/{job.slug}/apply/", {}, format="json")


@pytest.mark.django_db
def test_candidate_lists_and_views_own_application(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    api = login(profile)
    _apply(api, job)

    listed = api.get("/api/v1/candidate/applications/")
    assert listed.status_code == 200
    assert listed.json()["count"] == 1
    app_id = listed.json()["results"][0]["id"]

    detail = api.get(f"/api/v1/candidate/applications/{app_id}/")
    assert detail.status_code == 200
    assert detail.json()["status"] == ApplicationStatus.APPLIED
    assert len(detail.json()["status_history"]) == 1


@pytest.mark.django_db
def test_private_notes_never_exposed_to_candidate(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    api = login(profile)
    _apply(api, job)
    application = Application.objects.get(job=job, candidate=profile)
    application.employer_private_notes = "Top secret employer note"
    application.save()

    detail = api.get(f"/api/v1/candidate/applications/{application.id}/").json()
    assert "employer_private_notes" not in detail
    assert "secret" not in str(detail).lower()


@pytest.mark.django_db
def test_cannot_view_another_candidates_application(login, make_candidate, make_job):
    owner = make_candidate(email="owner@example.com")
    other = make_candidate(email="other@example.com")
    job = make_job()
    owner_api = login(owner)
    _apply(owner_api, job)
    application = Application.objects.get(job=job, candidate=owner)

    other_api = login(other)
    resp = other_api.get(f"/api/v1/candidate/applications/{application.id}/")
    assert resp.status_code == 404  # scoped queryset → not found, no existence leak


@pytest.mark.django_db
def test_already_applied_signal(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    api = login(profile)
    # Before applying → 404.
    assert api.get(f"/api/v1/jobs/{job.slug}/application/").status_code == 404
    _apply(api, job)
    # After applying → returns the application summary.
    resp = api.get(f"/api/v1/jobs/{job.slug}/application/")
    assert resp.status_code == 200
    assert resp.json()["status"] == ApplicationStatus.APPLIED


@pytest.mark.django_db
def test_dashboard_counts_are_real(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    api = login(profile)
    _apply(api, job)
    dash = api.get("/api/v1/candidate/dashboard/").json()
    assert dash["applications"]["total"] == 1
    assert dash["applications"]["by_stage"]["APPLIED"] == 1


@pytest.mark.django_db
def test_rejected_excluded_from_active_snapshot(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    api = login(profile)
    _apply(api, job)
    application = Application.objects.get(job=job, candidate=profile)
    application.status = ApplicationStatus.REJECTED
    application.save()
    ApplicationStatusHistory.objects.create(
        application=application,
        from_status=ApplicationStatus.APPLIED,
        to_status=ApplicationStatus.REJECTED,
        changed_by=None,
    )
    dash = api.get("/api/v1/candidate/dashboard/").json()
    assert dash["applications"]["total"] == 1
    assert dash["applications"]["active"] == 0  # rejected is not "active" progress


@pytest.mark.django_db(transaction=True)
def test_resume_replacement_does_not_change_snapshot(login, make_candidate, make_job):
    profile = make_candidate()
    job = make_job()
    api = login(profile)
    _apply(api, job)
    application = Application.objects.get(job=job, candidate=profile)
    application.resume_file_snapshot.open("rb")
    original_snapshot = application.resume_file_snapshot.read()
    application.resume_file_snapshot.close()

    # Replace the candidate's live resume with different bytes.
    profile.resume_file.save("new.pdf", ContentFile(b"%PDF-1.4 totally different bytes"), save=True)

    application.refresh_from_db()
    application.resume_file_snapshot.open("rb")
    after = application.resume_file_snapshot.read()
    application.resume_file_snapshot.close()
    assert after == original_snapshot  # snapshot is immutable
