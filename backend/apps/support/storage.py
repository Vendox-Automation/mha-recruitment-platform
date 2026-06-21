"""Private storage path for support-request attachments (ADR-0001 §5).

A support request may carry a resume/document attachment. Like a candidate
resume, it is personal data and must NEVER be reachable through a public or
predictable URL. We reuse the EXISTING private storage backend
(:data:`apps.candidates.storage.private_resume_storage`) — a ``FileSystemStorage``
rooted outside any public/static route with ``base_url=None`` so ``.url`` raises —
rather than introducing a second private root. Only the ``upload_to`` prefix
differs so support attachments and resumes never collide on disk.

The stored name is a server-generated UUID; the client filename is never trusted
for the path (path-traversal defence), exactly as for resumes
(:class:`apps.candidates.storage.ResumeUploadTo`).
"""

from __future__ import annotations

import uuid
from pathlib import PurePosixPath

from django.utils.deconstruct import deconstructible


@deconstructible
class SupportAttachmentUploadTo:
    """Generate an opaque, server-side path for a support attachment.

    Only the validated extension (``.pdf`` / ``.docx``) is reused from the client
    filename; everything else is discarded. The opaque UUID name makes the stored
    object both unguessable (no enumeration) and traversal-proof.
    """

    def __call__(self, instance, filename: str) -> str:
        suffix = PurePosixPath(PurePosixPath(filename).name).suffix.lower()
        if suffix not in {".pdf", ".docx"}:
            suffix = ""
        opaque = f"{uuid.uuid4().hex}{suffix}"
        return f"support_attachments/{opaque}"


support_attachment_upload_to = SupportAttachmentUploadTo()
