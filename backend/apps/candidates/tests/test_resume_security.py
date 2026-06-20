"""Security-focused resume tests (ADR-0001 §5, spec §22.2, §28.4, AGENTS §12).

These cover the highest-risk surface of Phase 5: that private resume bytes are
validated on upload, stored under an opaque server-generated name, served ONLY
through the permission-checked view, and never exposed via a public URL or to a
different candidate.
"""

from __future__ import annotations

import json

import pytest
from django.core.files.uploadedfile import SimpleUploadedFile

from apps.audit.models import AuditLog
from apps.candidates.models import CandidateProfile
from apps.candidates.tests.conftest import (
    docx_bytes,
    pdf_bytes,
    plain_zip_bytes,
)

PROFILE_URL = "/api/v1/candidate/profile/"
RESUME_URL = "/api/v1/candidate/resume/"
DOWNLOAD_URL = "/api/v1/candidate/resume/download/"
DASHBOARD_URL = "/api/v1/candidate/dashboard/"


def _upload(api, content: bytes, name: str, content_type: str = "application/pdf"):
    return api.post(
        RESUME_URL,
        {"file": SimpleUploadedFile(name, content, content_type=content_type)},
        format="multipart",
    )


# --- Accept valid uploads --------------------------------------------------


@pytest.mark.django_db
def test_valid_pdf_accepted(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    resp = _upload(api, pdf_bytes(), "My Resume.pdf")
    assert resp.status_code == 201, resp.content
    body = resp.json()
    assert body["has_resume"] is True
    assert body["original_name"] == "My Resume.pdf"
    assert body["uploaded_at"] is not None
    # No URL or path is ever returned.
    assert "url" not in json.dumps(body)


@pytest.mark.django_db
def test_valid_docx_accepted(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    resp = _upload(
        api,
        docx_bytes(),
        "cv.docx",
        content_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )
    assert resp.status_code == 201, resp.content
    assert resp.json()["has_resume"] is True


# --- Reject bad uploads ----------------------------------------------------


@pytest.mark.django_db
def test_reject_wrong_extension(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    resp = _upload(api, pdf_bytes(), "resume.txt", content_type="text/plain")
    assert resp.status_code == 400
    assert resp.json()["code"] == "validation_error"


@pytest.mark.django_db
def test_reject_oversized(api, make_candidate, settings):
    settings.RESUME_MAX_BYTES = 1024  # 1 KB cap for the test
    user = make_candidate()
    api.force_authenticate(user)
    big = pdf_bytes(b"x" * 4096)
    resp = _upload(api, big, "big.pdf")
    assert resp.status_code == 400
    assert resp.json()["code"] == "validation_error"


@pytest.mark.django_db
def test_reject_pdf_extension_with_non_pdf_bytes(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    # Claims .pdf but the content is not %PDF (e.g. HTML smuggling).
    resp = _upload(api, b"<html><script>x</script></html>", "evil.pdf")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_reject_executable_renamed_to_pdf(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    # PE/MZ header — a Windows executable masquerading as a PDF.
    resp = _upload(api, b"MZ\x90\x00" + b"\x00" * 64, "malware.pdf")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_reject_zip_renamed_to_docx(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    # Valid ZIP but not OOXML — must be rejected as a non-DOCX archive.
    resp = _upload(
        api,
        plain_zip_bytes(),
        "archive.docx",
        content_type="application/zip",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_reject_empty_file(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    resp = _upload(api, b"", "empty.pdf")
    assert resp.status_code == 400


# --- Opaque storage name + original name preserved -------------------------


@pytest.mark.django_db
def test_stored_name_is_server_generated(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    _upload(api, pdf_bytes(), "Private CV 2026.pdf")
    profile = CandidateProfile.objects.get(user=user)
    stored = profile.resume_file.name
    # Client name does not appear in the stored path; it's an opaque uuid.
    assert "Private CV 2026" not in stored
    assert stored.startswith(f"resumes/{user.id}/")
    assert stored.endswith(".pdf")
    # Display name is preserved separately.
    assert profile.resume_original_name == "Private CV 2026.pdf"


@pytest.mark.django_db
def test_path_traversal_filename_is_neutralised(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    _upload(api, pdf_bytes(), "../../../../etc/passwd.pdf")
    profile = CandidateProfile.objects.get(user=user)
    stored = profile.resume_file.name
    # No parent-dir escape survives; stored under the per-user opaque prefix.
    assert ".." not in stored
    assert stored.startswith(f"resumes/{user.id}/")


# --- Download: owner only, no public URL -----------------------------------


@pytest.mark.django_db
def test_owner_can_download(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    _upload(api, pdf_bytes(b"OWNER-BYTES"), "resume.pdf")
    resp = api.get(DOWNLOAD_URL)
    assert resp.status_code == 200
    assert resp["Content-Type"] == "application/pdf"
    assert "attachment" in resp["Content-Disposition"]
    assert b"OWNER-BYTES" in b"".join(resp.streaming_content)


@pytest.mark.django_db
def test_download_404_when_no_resume(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    resp = api.get(DOWNLOAD_URL)
    assert resp.status_code == 404


@pytest.mark.django_db
def test_other_candidate_cannot_download(api, make_candidate):
    owner = make_candidate(email="owner@example.com")
    other = make_candidate(email="other@example.com")
    api.force_authenticate(owner)
    _upload(api, pdf_bytes(b"SECRET"), "resume.pdf")

    # A different candidate hitting the same endpoint sees only their own
    # (absent) resume — never the owner's bytes.
    api.force_authenticate(other)
    resp = api.get(DOWNLOAD_URL)
    assert resp.status_code == 404


@pytest.mark.django_db
def test_anonymous_cannot_download(api):
    resp = api.get(DOWNLOAD_URL)
    assert resp.status_code in (401, 403)


@pytest.mark.django_db
def test_employer_cannot_use_candidate_resume_endpoints(api, make_employer):
    user = make_employer()
    api.force_authenticate(user)
    assert api.get(DOWNLOAD_URL).status_code == 403
    assert api.get(PROFILE_URL).status_code == 403
    assert _upload(api, pdf_bytes(), "resume.pdf").status_code == 403


@pytest.mark.django_db
def test_no_public_url_in_any_response(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    _upload(api, pdf_bytes(), "resume.pdf")
    profile = CandidateProfile.objects.get(user=user)
    # The opaque server-side stored name (the unguessable uuid path) must never
    # appear in any response; only the human display name is allowed.
    opaque_name = profile.resume_file.name  # e.g. resumes/<uuid>/<uuid>.pdf
    opaque_stem = opaque_name.rsplit("/", 1)[-1].split(".")[0]
    for url in (PROFILE_URL, DASHBOARD_URL):
        body = json.dumps(api.get(url).json())
        assert "resume_file" not in body
        assert "private_media" not in body
        assert "/media/" not in body
        assert opaque_name not in body
        assert opaque_stem not in body


# --- Replace + remove ------------------------------------------------------


@pytest.mark.django_db(transaction=True)
def test_replace_deletes_old_file(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    _upload(api, pdf_bytes(), "first.pdf")
    profile = CandidateProfile.objects.get(user=user)
    old_name = profile.resume_file.name
    old_storage = profile.resume_file.storage
    assert old_storage.exists(old_name)

    # The old file is deleted on transaction commit (so a rollback is safe);
    # with a real transaction the commit hook fires.
    _upload(api, pdf_bytes(), "second.pdf")
    profile.refresh_from_db()
    new_name = profile.resume_file.name
    assert new_name != old_name
    assert profile.resume_original_name == "second.pdf"
    # The old bytes are gone; the new ones remain.
    assert not old_storage.exists(old_name)
    assert old_storage.exists(new_name)


@pytest.mark.django_db(transaction=True)
def test_remove_clears_metadata_and_file(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    _upload(api, pdf_bytes(), "resume.pdf")
    profile = CandidateProfile.objects.get(user=user)
    storage = profile.resume_file.storage
    name = profile.resume_file.name

    resp = api.delete(RESUME_URL)
    assert resp.status_code == 204
    profile.refresh_from_db()
    assert profile.has_resume is False
    assert profile.resume_original_name == ""
    assert profile.resume_uploaded_at is None
    assert profile.resume_parsing_status == CandidateProfile.ResumeParsingStatus.NONE
    assert not storage.exists(name)


# --- Audit -----------------------------------------------------------------


@pytest.mark.django_db
def test_upload_and_remove_emit_audit_events(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    _upload(api, pdf_bytes(), "resume.pdf")
    assert AuditLog.objects.filter(action="resume.uploaded").count() == 1
    api.delete(RESUME_URL)
    assert AuditLog.objects.filter(action="resume.removed").count() == 1


@pytest.mark.django_db
def test_download_emits_audit_event(api, make_candidate):
    user = make_candidate()
    api.force_authenticate(user)
    _upload(api, pdf_bytes(), "resume.pdf")
    api.get(DOWNLOAD_URL)
    assert AuditLog.objects.filter(action="resume.downloaded").count() == 1
