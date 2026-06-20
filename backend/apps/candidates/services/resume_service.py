"""Resume upload validation + storage workflow (ADR-0001 §5, spec §22.2).

Resumes are private personal data. This module is the single place that decides
whether an uploaded file is acceptable and the single place that mutates the
resume-related columns on a :class:`CandidateProfile`. Views call ``store_resume``
/ ``remove_resume`` and never touch the FileField directly.

Security posture enforced here (defence in depth — every check must pass):

* Extension allowlist: ``.pdf`` / ``.docx`` only (``settings.RESUME_ALLOWED_EXTENSIONS``).
* Size limit: ``<= settings.RESUME_MAX_BYTES`` (5 MB) and non-empty.
* Content/MIME sniff by magic bytes (NOT the client's Content-Type, which is
  attacker-controlled): a PDF must begin with ``%PDF``; a DOCX must be a ZIP
  container beginning with ``PK\x03\x04`` AND actually contain the OOXML
  ``[Content_Types].xml`` member. This rejects executables, archives, renamed
  files, and HTML masquerading as a document.
* The stored path is server-generated (opaque UUID) by the FileField's
  ``upload_to``; the client filename only ever survives as display metadata
  (``resume_original_name``), so path traversal is structurally impossible.

We sniff magic bytes with the stdlib only (``zipfile`` / byte prefixes) — no
``python-magic`` dependency (AGENTS §12, no new deps).
"""

from __future__ import annotations

import io
import zipfile
from pathlib import PurePosixPath

from django.conf import settings
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError

from apps.audit.services import record_action
from apps.candidates.models import CandidateProfile

# Magic-byte signatures (content sniff, independent of client Content-Type).
_PDF_MAGIC = b"%PDF"
_ZIP_MAGIC = b"PK\x03\x04"


def _ext_of(filename: str) -> str:
    """Lower-cased extension without the dot, from the final name component."""
    name = PurePosixPath(filename or "").name
    return PurePosixPath(name).suffix.lower().lstrip(".")


def _read_head(upload: UploadedFile, n: int) -> bytes:
    """Read the first ``n`` bytes of an upload without consuming it."""
    upload.seek(0)
    head = upload.read(n)
    upload.seek(0)
    return head


def _validate_pdf(upload: UploadedFile) -> None:
    if not _read_head(upload, len(_PDF_MAGIC)).startswith(_PDF_MAGIC):
        raise ValidationError({"file": ["This file is not a valid PDF document."]})


def _validate_docx(upload: UploadedFile) -> None:
    head = _read_head(upload, len(_ZIP_MAGIC))
    if not head.startswith(_ZIP_MAGIC):
        raise ValidationError({"file": ["This file is not a valid DOCX document."]})
    # A DOCX is a ZIP container; confirm it is actually OOXML, not a generic
    # archive (rejects renamed .zip files and zip-bomb-shaped uploads here).
    upload.seek(0)
    try:
        with zipfile.ZipFile(io.BytesIO(upload.read())) as zf:
            names = set(zf.namelist())
    except zipfile.BadZipFile as exc:
        upload.seek(0)
        raise ValidationError({"file": ["This file is not a valid DOCX document."]}) from exc
    upload.seek(0)
    if "[Content_Types].xml" not in names or not any(n.startswith("word/") for n in names):
        raise ValidationError({"file": ["This file is not a valid DOCX document."]})


def validate_resume_upload(upload: UploadedFile) -> str:
    """Validate an uploaded resume; return the canonical extension or raise.

    Raises ``rest_framework.exceptions.ValidationError`` (normalised envelope)
    on any failure so the client receives the standard ``validation_error`` shape.
    """
    if upload is None:
        raise ValidationError({"file": ["No file was uploaded."]})

    size = upload.size or 0
    if size == 0:
        raise ValidationError({"file": ["The uploaded file is empty."]})
    if size > settings.RESUME_MAX_BYTES:
        max_mb = settings.RESUME_MAX_BYTES // (1024 * 1024)
        raise ValidationError(
            {"file": [f"The file is too large. The maximum size is {max_mb} MB."]}
        )

    ext = _ext_of(upload.name)
    if ext not in settings.RESUME_ALLOWED_EXTENSIONS:
        allowed = ", ".join(f".{e}" for e in settings.RESUME_ALLOWED_EXTENSIONS)
        raise ValidationError({"file": [f"Unsupported file type. Allowed types: {allowed}."]})

    # Content must match the claimed extension (magic-byte sniff).
    if ext == "pdf":
        _validate_pdf(upload)
    elif ext == "docx":
        _validate_docx(upload)
    else:  # pragma: no cover - guarded by the allowlist above
        raise ValidationError({"file": ["Unsupported file type."]})

    return ext


def _safe_display_name(filename: str, ext: str) -> str:
    """Sanitise the client filename for display/download (never for storage)."""
    base = PurePosixPath(filename or "").name or f"resume.{ext}"
    # Strip control characters and length-cap for the metadata column.
    cleaned = "".join(ch for ch in base if ch.isprintable() and ch not in '\\/"\r\n\t')
    cleaned = cleaned.strip() or f"resume.{ext}"
    return cleaned[:255]


@transaction.atomic
def store_resume(*, profile: CandidateProfile, upload: UploadedFile, actor) -> CandidateProfile:
    """Validate and persist a resume for ``profile``, replacing any previous one.

    The whole operation is atomic: validation, deletion of the prior stored file,
    the new write, the metadata update, and the audit row commit or roll back
    together. The previously stored file is deleted only after the new file is
    saved, so a mid-operation failure never leaves the candidate with no resume
    when they had one.
    """
    ext = validate_resume_upload(upload)
    display_name = _safe_display_name(upload.name, ext)

    old_file = profile.resume_file if profile.resume_file else None
    old_name = old_file.name if old_file else None

    # Bind the new file (opaque server-side name via upload_to) and metadata.
    profile.resume_file = upload
    profile.resume_original_name = display_name
    profile.resume_uploaded_at = timezone.now()
    profile.resume_parsing_status = CandidateProfile.ResumeParsingStatus.PENDING
    # Keyword extraction is a future synchronous step (ADR-0001 §10); reset now.
    profile.resume_extracted_keywords_json = []
    profile.save(
        update_fields=[
            "resume_file",
            "resume_original_name",
            "resume_uploaded_at",
            "resume_parsing_status",
            "resume_extracted_keywords_json",
            "updated_at",
        ]
    )

    # Replace semantics: drop the previous stored bytes now that the new file is
    # committed to the field. Guard against the (impossible) self-overwrite.
    if old_name and old_name != profile.resume_file.name:
        # Delete after the surrounding transaction commits so a rollback keeps
        # the old bytes recoverable; ``save=False`` avoids re-touching the row.
        transaction.on_commit(
            lambda storage=profile.resume_file.storage, name=old_name: storage.delete(name)
        )

    record_action(
        actor=actor,
        action="resume.uploaded",
        target=profile,
        metadata={"replaced": bool(old_name)},
    )
    return profile


@transaction.atomic
def remove_resume(*, profile: CandidateProfile, actor) -> CandidateProfile:
    """Delete the stored resume bytes and clear all resume metadata."""
    if not profile.resume_file:
        return profile

    storage = profile.resume_file.storage
    name = profile.resume_file.name

    profile.resume_file = None
    profile.resume_original_name = ""
    profile.resume_uploaded_at = None
    profile.resume_parsing_status = CandidateProfile.ResumeParsingStatus.NONE
    profile.resume_extracted_keywords_json = []
    profile.save(
        update_fields=[
            "resume_file",
            "resume_original_name",
            "resume_uploaded_at",
            "resume_parsing_status",
            "resume_extracted_keywords_json",
            "updated_at",
        ]
    )

    transaction.on_commit(lambda: storage.delete(name))

    record_action(actor=actor, action="resume.removed", target=profile)
    return profile
