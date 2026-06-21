"""Job-view recording (spec §20.12, §15.8 privacy).

``record_job_view`` is called from the public job-detail view. It records at most
one :class:`JobViewEvent` per (job, viewer) within a short de-duplication window
so refreshes and quick re-opens do not inflate a job's view count.

Privacy posture (AGENTS §13):

* The viewer identity stored is either the authenticated ``user`` FK OR, for an
  anonymous viewer, a SALTED one-way hash of the Django session key — never the
  raw session key, never the IP, never the user-agent. The salt is the server
  ``SECRET_KEY`` and is not stored, so the hash cannot be reversed or correlated
  across services.
* If an anonymous request has no usable session identifier, we still count the
  view (hash ``None``) rather than fall back to the IP — honest under-counting is
  preferred over storing PII.
* Recording must never break page rendering: any unexpected error is swallowed
  (telemetry is best-effort), so a logging failure cannot 500 a public page.
"""

from __future__ import annotations

import hashlib
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

from apps.analytics.models import JobViewEvent

# De-duplication window: repeated views by the same viewer inside this span do
# not create a second row. 30 minutes is long enough to absorb refreshes/tab
# re-opens while still counting a genuine return visit later in the day.
DEDUPE_WINDOW = timedelta(minutes=30)


def _anonymous_session_hash(request) -> str | None:
    """Return a salted hash of the session key, or ``None`` if unavailable.

    Uses the Django session key (NOT the IP). The key is salted with
    ``SECRET_KEY`` and hashed with SHA-256; only the digest is returned, so no
    raw identifier ever reaches the database.
    """
    session = getattr(request, "session", None)
    session_key = session.session_key if session is not None else None
    if not session_key:
        # Create a session so anonymous de-duplication has something stable to
        # hash. If sessions are unavailable, we simply count without dedupe.
        if session is not None:
            try:
                session.save()
                session_key = session.session_key
            except Exception:  # pragma: no cover - defensive; never break a page
                session_key = None
    if not session_key:
        return None
    salted = f"{settings.SECRET_KEY}:{session_key}".encode()
    return hashlib.sha256(salted).hexdigest()


def record_job_view(job, request) -> JobViewEvent | None:
    """Record a de-duplicated public view of ``job`` (best-effort).

    Returns the created event, or ``None`` if the view was de-duplicated or
    recording was skipped. Never raises — telemetry must not break the page.
    """
    try:
        user = getattr(request, "user", None)
        user = user if (user is not None and user.is_authenticated) else None

        session_hash = None if user is not None else _anonymous_session_hash(request)

        # Skip if neither identifier is available for an anonymous viewer: we
        # cannot dedupe, but we still record one honest view.
        cutoff = timezone.now() - DEDUPE_WINDOW
        recent = JobViewEvent.objects.filter(job=job, viewed_at__gte=cutoff)
        if user is not None:
            if recent.filter(user=user).exists():
                return None
        elif session_hash is not None:
            if recent.filter(anonymous_session_hash=session_hash).exists():
                return None

        return JobViewEvent.objects.create(
            job=job,
            user=user,
            anonymous_session_hash=session_hash,
        )
    except Exception:  # pragma: no cover - telemetry is best-effort
        return None
