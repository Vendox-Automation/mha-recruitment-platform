"""Tests for the ``seed_demo_data`` management command (spec §27).

Verifies the command (1) creates the documented demo accounts and a coherent
dataset, and (2) is idempotent — running it twice yields identical row counts and
never duplicates anything.
"""

from __future__ import annotations

import pytest
from django.core.management import call_command
from django.test import override_settings

from apps.accounts.management.commands import seed_demo_data as seed
from apps.accounts.models import User
from apps.analytics.models import JobViewEvent, MarketInsight
from apps.applications.models import Application, ApplicationStatus
from apps.candidates.models import CandidateProfile, SavedJob
from apps.employers.models import EmployerProfile
from apps.jobs.models import Job, ScreeningQuestion
from apps.matching.models import JobFitResult
from apps.support.models import SupportRequest


def _snapshot_counts() -> dict[str, int]:
    return {
        "users": User.objects.count(),
        "employers": EmployerProfile.objects.count(),
        "candidates": CandidateProfile.objects.count(),
        "jobs": Job.objects.count(),
        "screening": ScreeningQuestion.objects.count(),
        "applications": Application.objects.count(),
        "saved_jobs": SavedJob.objects.count(),
        "job_fits": JobFitResult.objects.count(),
        "support": SupportRequest.objects.count(),
        "views": JobViewEvent.objects.count(),
        "insights": MarketInsight.objects.count(),
    }


@pytest.mark.django_db(transaction=True)
@override_settings(DEBUG=True)
def test_seed_creates_demo_accounts_and_dataset():
    call_command("seed_demo_data")

    # Documented demo accounts exist with the right roles.
    admin = User.objects.get(email=seed.ADMIN_EMAIL)
    assert admin.is_superuser and admin.role == User.Role.ADMIN

    approved = User.objects.get(email=seed.DEMO_EMPLOYERS[0]["email"])
    assert approved.employer_profile.is_approved

    pending = User.objects.get(email=seed.PENDING_EMPLOYER["email"])
    assert pending.employer_profile.approval_status == EmployerProfile.ApprovalStatus.PENDING

    complete = User.objects.get(email=seed.CANDIDATE_COMPLETE_EMAIL).candidate_profile
    assert complete.has_resume
    assert complete.preferred_job_title  # complete profile

    incomplete = User.objects.get(email=seed.CANDIDATE_INCOMPLETE_EMAIL).candidate_profile
    assert not incomplete.has_resume
    assert not incomplete.preferred_job_title  # deliberately incomplete

    # The shared demo password authenticates the accounts.
    assert admin.check_password(seed.DEMO_PASSWORD)

    # Volume guarantees from spec §27.2.
    assert (
        EmployerProfile.objects.filter(
            approval_status=EmployerProfile.ApprovalStatus.APPROVED
        ).count()
        >= 5
    )
    assert Job.objects.count() >= 20

    # Applications cover every status.
    seeded_statuses = set(
        Application.objects.filter(candidate=complete).values_list("status", flat=True)
    )
    assert seeded_statuses == set(ApplicationStatus.values)

    # Supporting demo content is present.
    assert SavedJob.objects.filter(candidate=complete).exists()
    assert JobFitResult.objects.filter(candidate=complete).exists()
    assert SupportRequest.objects.exists()
    assert JobViewEvent.objects.exists()
    assert MarketInsight.objects.filter(is_published=True).exists()

    # MHA-direct (employer-less) jobs and draft/closed states are represented.
    assert Job.objects.filter(employer__isnull=True).exists()
    assert Job.objects.filter(status=Job.Status.DRAFT).exists()
    assert Job.objects.filter(status=Job.Status.CLOSED).exists()


@pytest.mark.django_db(transaction=True)
@override_settings(DEBUG=True)
def test_seed_is_idempotent():
    call_command("seed_demo_data")
    first = _snapshot_counts()

    call_command("seed_demo_data")
    second = _snapshot_counts()

    assert first == second, f"second run changed counts: {first} -> {second}"


@pytest.mark.django_db
@override_settings(DEBUG=False)
def test_seed_refuses_without_force_when_not_debug():
    from django.core.management.base import CommandError

    with pytest.raises(CommandError):
        call_command("seed_demo_data")

    assert not User.objects.filter(email=seed.ADMIN_EMAIL).exists()
