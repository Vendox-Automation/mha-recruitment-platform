"""JobViewEvent recording: dedup, no PII, public-detail wiring (spec §20.12)."""

from __future__ import annotations

import pytest
from django.test import RequestFactory
from django.urls import reverse

from apps.analytics.models import JobViewEvent
from apps.analytics.services.recording import record_job_view
from apps.jobs.models import Job


@pytest.fixture
def public_job(db):
    return Job.objects.create(title="Data Analyst", status=Job.Status.PUBLISHED)


def _request_with_session(rf: RequestFactory, *, user=None):
    from django.contrib.sessions.backends.db import SessionStore

    request = rf.get("/api/v1/jobs/x/", REMOTE_ADDR="203.0.113.9")
    request.session = SessionStore()

    class _Anon:
        is_authenticated = False

    request.user = user if user is not None else _Anon()
    return request


@pytest.mark.django_db
def test_anonymous_view_recorded_without_pii(public_job):
    rf = RequestFactory()
    request = _request_with_session(rf)
    event = record_job_view(public_job, request)

    assert event is not None
    assert event.user_id is None
    # A salted hash is stored, never the raw IP / session key.
    assert event.anonymous_session_hash is not None
    assert event.anonymous_session_hash != request.session.session_key
    assert "203.0.113.9" not in (event.anonymous_session_hash or "")


@pytest.mark.django_db
def test_repeat_view_is_deduplicated(public_job):
    rf = RequestFactory()
    request = _request_with_session(rf)
    first = record_job_view(public_job, request)
    second = record_job_view(public_job, request)  # same session, within window
    assert first is not None
    assert second is None
    assert JobViewEvent.objects.filter(job=public_job).count() == 1


@pytest.mark.django_db
def test_authenticated_view_deduplicated_per_user(public_job, make_candidate):
    candidate = make_candidate()
    rf = RequestFactory()
    request = _request_with_session(rf, user=candidate.user)

    first = record_job_view(public_job, request)
    second = record_job_view(public_job, request)
    assert first is not None and first.user_id == candidate.user_id
    assert second is None
    # No anonymous hash stored for an authenticated viewer.
    assert first.anonymous_session_hash is None


@pytest.mark.django_db
def test_public_detail_view_records_event(api, public_job):
    url = reverse("jobs-public:public-job-detail", args=[public_job.slug])
    resp = api.get(url)
    assert resp.status_code == 200
    assert JobViewEvent.objects.filter(job=public_job).count() == 1


@pytest.mark.django_db
def test_distinct_sessions_count_separately(public_job):
    rf = RequestFactory()
    r1 = _request_with_session(rf)
    r2 = _request_with_session(rf)
    # Force distinct session keys.
    r1.session.create()
    r2.session.create()
    record_job_view(public_job, r1)
    record_job_view(public_job, r2)
    assert JobViewEvent.objects.filter(job=public_job).count() == 2
