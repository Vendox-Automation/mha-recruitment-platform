"""Private file storage for resumes (ADR-0001 §5, spec §22.2).

Resumes are personal data and must NEVER be reachable through a public or
predictable URL. To guarantee that, they are written through a dedicated
``FileSystemStorage`` rooted at :data:`settings.PRIVATE_MEDIA_ROOT` — a directory
that lives OUTSIDE Django's ``STATIC``/public ``MEDIA`` serving and is
git-ignored. Nothing maps this root to an HTTP route; the only way to read a
resume's bytes is the permission-checked download view.

The storage object is the single seam for swapping to private object storage
(e.g. S3 with short-lived signed URLs) later (ADR-0001 §5.7): callers depend on
the ``FileField`` API (``.open()`` / ``.delete()``), never on a filesystem path
or ``.url``, so the field can be repointed at a different backend without
touching the API surface.
"""

from __future__ import annotations

import uuid
from pathlib import PurePosixPath

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


class PrivateResumeStorage(FileSystemStorage):
    """Filesystem storage rooted at the private (non-public) media root.

    ``base_url`` is deliberately ``None`` so any accidental ``FileField.url``
    access raises instead of leaking a path — there is no public URL by design.
    The location is resolved lazily from settings so the test settings' temp
    directory is honoured and the storage stays migration-serializable.
    """

    def __init__(self) -> None:
        super().__init__(location=str(settings.PRIVATE_MEDIA_ROOT), base_url=None)

    # Equality/identity helps Django avoid spurious migration noise for the
    # storage kwarg on the FileField across runs.
    def __eq__(self, other: object) -> bool:
        return isinstance(other, PrivateResumeStorage)

    def __hash__(self) -> int:
        return hash(PrivateResumeStorage)


# Module-level singleton referenced by the model's FileField.
private_resume_storage = PrivateResumeStorage()


@deconstructible
class ResumeUploadTo:
    """Generate an opaque, server-side storage path for a resume.

    The client-supplied filename is NEVER trusted for the stored path: only its
    extension (already validated by the resume service against the allowlist) is
    reused, and even that is lower-cased and stripped of any path component. The
    stored name is a fresh UUID4, which prevents both path traversal
    (``../``-style names cannot escape the per-user prefix) and enumeration
    (names are unguessable). The human-readable name lives in
    ``resume_original_name`` for display only.
    """

    def __call__(self, instance, filename: str) -> str:
        # Take only the final path component's suffix; discard everything else
        # the client sent so a crafted name cannot influence the location.
        suffix = PurePosixPath(PurePosixPath(filename).name).suffix.lower()
        if suffix not in {".pdf", ".docx"}:
            suffix = ""
        opaque = f"{uuid.uuid4().hex}{suffix}"
        return f"resumes/{instance.user_id}/{opaque}"


resume_upload_to = ResumeUploadTo()
