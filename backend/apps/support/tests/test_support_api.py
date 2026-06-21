"""Support intake/listing + attachment privacy + audit tests (spec §14.5, §22)."""

from __future__ import annotations

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse

from apps.audit.models import AuditLog
from apps.jobs.models import Job
from apps.support.models import SupportRequest, SupportStatus
from apps.support.services import support_service

from .conftest import PASSWORD, docx_bytes, pdf_bytes


def _intake_url() -> str:
    return reverse("support:create")


@pytest.mark.django_db
def test_guest_can_create_support_request(api):
    payload = {
        "name": "Guest Person",
        "email": "guest@example.com",
        "phone": "+60111111111",
        "category": "CAREER_DIRECTION",
        "message": "Please advise on my next steps.",
    }
    resp = api.post(_intake_url(), payload)
    assert resp.status_code == 201
    sr = SupportRequest.objects.get()
    assert sr.user_id is None  # guest stays anonymous
    assert sr.status == SupportStatus.NEW
    assert sr.email == "guest@example.com"


@pytest.mark.django_db
def test_candidate_request_links_user_and_job(api, make_candidate):
    candidate = make_candidate()
    job = Job.objects.create(title="Analyst", status=Job.Status.PUBLISHED)
    api.login(email=candidate.email, password=PASSWORD)

    resp = api.post(
        _intake_url(),
        {
            "name": "Synthetic Candidate",
            "email": candidate.email,
            "category": "JOB_APPLICATION",
            "message": "Help with this application.",
            "job": job.slug,
        },
    )
    assert resp.status_code == 201
    sr = SupportRequest.objects.get()
    assert sr.user_id == candidate.id
    assert sr.job_id == job.id


@pytest.mark.django_db
def test_attachment_accepts_valid_pdf(api):
    upload = SimpleUploadedFile("cv.pdf", pdf_bytes(), content_type="application/pdf")
    resp = api.post(
        _intake_url(),
        {
            "name": "Guest",
            "email": "g@example.com",
            "category": "RESUME",
            "message": "Resume attached.",
            "file": upload,
        },
        format="multipart",
    )
    assert resp.status_code == 201
    sr = SupportRequest.objects.get()
    assert sr.has_attachment
    # Stored under an opaque name, NOT the client filename.
    assert sr.resume_file.name.startswith("support_attachments/")
    assert "cv.pdf" not in sr.resume_file.name
    assert sr.resume_original_name == "cv.pdf"


@pytest.mark.django_db
def test_attachment_rejects_bad_type(api):
    bad = SimpleUploadedFile("evil.exe", b"MZ\x90\x00not a doc", content_type="application/pdf")
    resp = api.post(
        _intake_url(),
        {
            "name": "Guest",
            "email": "g@example.com",
            "category": "RESUME",
            "message": "bad file",
            "file": bad,
        },
        format="multipart",
    )
    assert resp.status_code == 400
    assert not SupportRequest.objects.exists()  # nothing persisted on rejection


@pytest.mark.django_db
def test_attachment_rejects_oversize(api, settings):
    settings.RESUME_MAX_BYTES = 100
    big = SimpleUploadedFile("cv.pdf", pdf_bytes(b"x" * 500), content_type="application/pdf")
    resp = api.post(
        _intake_url(),
        {
            "name": "Guest",
            "email": "g@example.com",
            "category": "RESUME",
            "message": "huge",
            "file": big,
        },
        format="multipart",
    )
    assert resp.status_code == 400
    assert not SupportRequest.objects.exists()


@pytest.mark.django_db
def test_candidate_lists_only_own_requests(api, make_candidate):
    mine = make_candidate(email="mine@example.com")
    theirs = make_candidate(email="theirs@example.com")
    support_service.create_support_request(
        user=mine, name="Mine", email="mine@example.com", category="OTHER", message="m"
    )
    support_service.create_support_request(
        user=theirs, name="Theirs", email="theirs@example.com", category="OTHER", message="t"
    )
    # A guest request must never appear in a candidate's list either.
    support_service.create_support_request(
        user=None, name="Guest", email="guest@example.com", category="OTHER", message="g"
    )

    api.login(email=mine.email, password=PASSWORD)
    resp = api.get(reverse("support-candidate:candidate-list"))
    assert resp.status_code == 200
    assert len(resp.data) == 1
    assert resp.data[0]["message"] == "m"


@pytest.mark.django_db
def test_admin_status_change_is_audited(make_admin):
    admin = make_admin()
    sr = support_service.create_support_request(
        user=None, name="Guest", email="g@example.com", category="OTHER", message="m"
    )
    support_service.change_status(
        support_request=sr, new_status=SupportStatus.RESOLVED, actor=admin
    )
    sr.refresh_from_db()
    assert sr.status == SupportStatus.RESOLVED

    entry = AuditLog.objects.get(action="support.status_changed")
    assert entry.actor_id == admin.id
    assert entry.metadata_json["from"] == "NEW"
    assert entry.metadata_json["to"] == "RESOLVED"
    assert entry.target_type == "support.SupportRequest"


@pytest.mark.django_db
def test_attachment_download_owner_only(api, make_candidate):
    owner = make_candidate(email="owner@example.com")
    other = make_candidate(email="other@example.com")
    upload = SimpleUploadedFile("cv.docx", docx_bytes())
    sr = support_service.create_support_request(
        user=owner,
        name="Owner",
        email="owner@example.com",
        category="RESUME",
        message="m",
        attachment=upload,
    )
    url = reverse("support:attachment-download", args=[str(sr.id)])

    # Owner can download.
    api.login(email=owner.email, password=PASSWORD)
    resp = api.get(url)
    assert resp.status_code == 200

    # A different candidate gets 404 (no existence leak).
    api.logout()
    api.login(email=other.email, password=PASSWORD)
    resp = api.get(url)
    assert resp.status_code == 404


@pytest.mark.django_db
def test_attachment_download_admin_allowed(api, make_candidate, make_admin):
    owner = make_candidate(email="owner@example.com")
    admin = make_admin()
    upload = SimpleUploadedFile("cv.docx", docx_bytes())
    sr = support_service.create_support_request(
        user=owner,
        name="Owner",
        email="owner@example.com",
        category="RESUME",
        message="m",
        attachment=upload,
    )
    api.login(email=admin.email, password=PASSWORD)
    resp = api.get(reverse("support:attachment-download", args=[str(sr.id)]))
    assert resp.status_code == 200


@pytest.mark.django_db
def test_attachment_stored_privately_and_not_serialised(api):
    from django.conf import settings

    from apps.support.serializers import SupportRequestSerializer

    upload = SimpleUploadedFile("cv.docx", docx_bytes())
    sr = support_service.create_support_request(
        user=None,
        name="Guest",
        email="g@example.com",
        category="RESUME",
        message="m",
        attachment=upload,
    )
    # The bytes live under the private (non-public) media root, not any served
    # static/media path, so there is no route that maps to them.
    assert str(settings.PRIVATE_MEDIA_ROOT) in sr.resume_file.path
    # The candidate-facing serializer exposes display metadata ONLY — never a
    # URL or storage path — so the attachment cannot leak via the API surface.
    data = SupportRequestSerializer(sr).data
    assert "resume_file" not in data
    assert "url" not in str(data).lower() or "resume_original_name" in data
    assert data["has_attachment"] is True
    assert data["resume_original_name"] == "cv.docx"
