"""Public visibility must follow employer approval (security review B1).

A published job is only public while its owning employer is APPROVED; suspending
or rejecting the employer removes the job from public search and detail. MHA-owned
jobs (no employer) stay public.
"""

from __future__ import annotations

import pytest

from apps.accounts.models import User
from apps.employers.models import EmployerProfile

JOBS_URL = "/api/v1/jobs/"


@pytest.mark.django_db
def test_suspending_employer_hides_their_published_jobs(api, make_employer, make_job):
    user = make_employer(email="vis@example.com")
    profile = user.employer_profile
    job = make_job(employer=profile, title="Visible Analyst")

    # Visible while the employer is approved.
    assert api.get(JOBS_URL).json()["count"] == 1
    assert api.get(f"{JOBS_URL}{job.slug}/").status_code == 200

    # Admin suspends the employer.
    profile.approval_status = EmployerProfile.ApprovalStatus.SUSPENDED
    profile.save()
    user.status = User.Status.SUSPENDED
    user.save()

    # The job must immediately disappear from public search and detail.
    assert api.get(JOBS_URL).json()["count"] == 0
    assert api.get(f"{JOBS_URL}{job.slug}/").status_code == 404


@pytest.mark.django_db
@pytest.mark.parametrize(
    "approval",
    [
        EmployerProfile.ApprovalStatus.PENDING,
        EmployerProfile.ApprovalStatus.REJECTED,
        EmployerProfile.ApprovalStatus.SUSPENDED,
    ],
)
def test_non_approved_employer_jobs_never_public(api, make_employer, make_job, approval):
    user = make_employer(
        email=f"{approval.lower()}@example.com",
        approval_status=approval,
        status=User.Status.PENDING,
    )
    job = make_job(employer=user.employer_profile)
    assert api.get(JOBS_URL).json()["count"] == 0
    assert api.get(f"{JOBS_URL}{job.slug}/").status_code == 404


@pytest.mark.django_db
def test_mha_direct_job_is_public_without_employer(api, make_job):
    job = make_job(employer=None, title="MHA Direct Role")
    assert api.get(JOBS_URL).json()["count"] == 1
    assert api.get(f"{JOBS_URL}{job.slug}/").status_code == 200
