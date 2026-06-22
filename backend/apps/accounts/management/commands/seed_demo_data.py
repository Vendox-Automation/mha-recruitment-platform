"""Idempotent demo-data seeder (spec §27; AGENTS §12, §13).

``python manage.py seed_demo_data`` populates a local/staging database with a
coherent, SYNTHETIC demo dataset so the platform can be explored end to end:
demo accounts (admin / employers / candidates), employer companies, a spread of
jobs across Malaysian locations and employment types, applications across every
status, saved jobs, Smart Job Fit examples, support requests, job-view telemetry
for employer analytics, and a few published MHA market insights.

Design rules:

* **Idempotent** — every object is created via ``get_or_create`` / ``update_or_create``
  keyed on a STABLE identifier (user email, a deterministic job seed-key stored in
  the slug, an employer's user, etc.). Running the command twice yields the same
  row counts and never duplicates anything (spec §27).
* **Synthetic only** — no real personal data. All emails are ``@demo.mha-jobs.local``
  / ``example.com``, names are obviously fictional, and every demo account shares
  one documented local-only password (AGENTS §12). The command refuses to run when
  ``DEBUG`` is False unless ``--force`` is passed, so it is hard to run in
  production by accident (spec §27.1: never use demo creds in production).
* **Goes through services, not raw writes, wherever a workflow exists** — employer
  approval (``approval_service``), application submission + status transitions
  (``apply_service`` / ``status_service``), saved jobs (``saved_job_service``),
  support intake (``support_service``), and Job Fit (``matching.services``). This
  keeps the seed honest: it produces exactly the state the real workflows would.

The data is clearly marked as demo (company summaries, job descriptions, and the
market-insight bodies all say so) and is for local/demo use only.
"""

from __future__ import annotations

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.analytics.models import JobViewEvent, MarketInsight
from apps.applications.models import Application, ApplicationStatus
from apps.applications.services import apply_service, status_service
from apps.candidates.models import CandidateProfile
from apps.candidates.services import resume_service, saved_job_service
from apps.employers.models import EmployerProfile
from apps.employers.services import approval_service
from apps.jobs.models import Job, ScreeningQuestion
from apps.jobs.services import lifecycle
from apps.matching.services import compute_job_fit
from apps.reviews.models import CompanyReview, EmployerReply
from apps.reviews.services import create_review, set_reply
from apps.support.models import SupportCategory, SupportRequest, SupportStatus
from apps.support.services import support_service

# One documented, local-only password shared by every demo account. This is
# intentionally simple for demos and must NEVER be used in production (spec §27.1).
DEMO_PASSWORD = "DemoPass123!"  # noqa: S105 - documented demo credential, local only

# Stable demo email identifiers (the idempotency key for accounts).
ADMIN_EMAIL = "admin@demo.mha-jobs.local"
CANDIDATE_COMPLETE_EMAIL = "candidate.complete@demo.mha-jobs.local"
CANDIDATE_INCOMPLETE_EMAIL = "candidate.incomplete@demo.mha-jobs.local"

# A tiny but structurally valid PDF (starts with the %PDF magic bytes the resume
# validator requires). Synthetic, no personal data.
_DEMO_PDF_BYTES = (
    b"%PDF-1.4\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 300 144]>>endobj\n"
    b"trailer<</Root 1 0 R>>\n"
    b"%%EOF\n"
)


def _demo_upload(name: str, content: bytes) -> ContentFile:
    """Build a real Django ``File`` (``ContentFile``) for the seed resume.

    ``resume_service.store_resume`` assigns the upload onto a ``FileField`` and
    saves it, so the object must be a genuine Django ``File`` (it needs
    ``_committed`` etc.) — not a bare duck-typed stub. ``ContentFile`` already
    provides ``.read``/``.seek``/``.size`` for the validator and a real file API
    for the field; we only set ``.name`` so the extension allowlist sees ``.pdf``.
    """
    upload = ContentFile(content, name=name)
    upload.size = len(content)
    return upload


# Five demo employer companies (approved). Keyed by user email for idempotency.
DEMO_EMPLOYERS = [
    {
        "email": "talent@demo.aurorabank.example.com",
        "company_name": "Aurora Bank Berhad (DEMO)",
        "contact_person": "Mei Ling Tan",
        "industry": "Banking & Financial Services",
        "company_size": "1000-5000",
        "company_location": "Kuala Lumpur",
        "company_summary": (
            "DEMO COMPANY — synthetic data. Aurora Bank is a fictional retail and "
            "corporate bank used to demonstrate the MHA platform."
        ),
        "website": "https://aurorabank.example.com",
    },
    {
        "email": "hr@demo.nimbustech.example.com",
        "company_name": "Nimbus Technologies (DEMO)",
        "contact_person": "Arjun Pillai",
        "industry": "Software & Cloud",
        "company_size": "200-1000",
        "company_location": "Cyberjaya",
        "company_summary": (
            "DEMO COMPANY — synthetic data. Nimbus Technologies is a fictional "
            "cloud-software firm used for platform demonstrations."
        ),
        "website": "https://nimbustech.example.com",
    },
    {
        "email": "careers@demo.greenfieldlogistics.example.com",
        "company_name": "Greenfield Logistics (DEMO)",
        "contact_person": "Siti Nuraini",
        "industry": "Logistics & Supply Chain",
        "company_size": "500-1000",
        "company_location": "Port Klang",
        "company_summary": (
            "DEMO COMPANY — synthetic data. Greenfield Logistics is a fictional "
            "supply-chain operator used for platform demonstrations."
        ),
        "website": "https://greenfieldlogistics.example.com",
    },
    {
        "email": "people@demo.coastalretail.example.com",
        "company_name": "Coastal Retail Group (DEMO)",
        "contact_person": "Daniel Wong",
        "industry": "Retail & Consumer",
        "company_size": "1000-5000",
        "company_location": "Penang",
        "company_summary": (
            "DEMO COMPANY — synthetic data. Coastal Retail Group is a fictional "
            "retail chain used for platform demonstrations."
        ),
        "website": "https://coastalretail.example.com",
    },
    {
        "email": "jobs@demo.meridianhealth.example.com",
        "company_name": "Meridian Health Services (DEMO)",
        "contact_person": "Priya Subramaniam",
        "industry": "Healthcare",
        "company_size": "200-1000",
        "company_location": "Johor Bahru",
        "company_summary": (
            "DEMO COMPANY — synthetic data. Meridian Health Services is a fictional "
            "healthcare provider used for platform demonstrations."
        ),
        "website": "https://meridianhealth.example.com",
    },
]

# A pending (unapproved) employer so the admin approval queue has a demo entry.
PENDING_EMPLOYER = {
    "email": "pending@demo.summitventures.example.com",
    "company_name": "Summit Ventures (DEMO, pending)",
    "contact_person": "Faizal Rahman",
    "industry": "Consulting",
    "company_size": "50-200",
    "company_location": "Petaling Jaya",
    "company_summary": (
        "DEMO COMPANY — synthetic data, pending approval. Summit Ventures is a "
        "fictional consulting firm used to demonstrate the approval queue."
    ),
    "website": "https://summitventures.example.com",
}

# Real MHA partner / owned brands shown as approved employers in the company
# directory and homepage "Featured organisations". These are NOT synthetic demo
# companies, so they carry NEUTRAL summaries (no DEMO wording) and an EXPLICIT,
# stable ``slug`` — the frontend maps each company's logo by these exact slugs,
# so the slug must never change between runs. Keyed by user email for idempotency.
PARTNER_COMPANIES = [
    {
        "slug": "vendox",
        "email": "talent@vendox.co",
        "company_name": "Vendox",
        "contact_person": "Vendox Talent",
        "industry": "Technology & Software",
        "company_size": "50-200",
        "company_location": "Kuala Lumpur",
        "company_summary": "Vendox builds modern software products.",
        "website": "https://vendox.co",
    },
    {
        "slug": "mha",
        "email": "careers@mha.example.com",
        "company_name": "MHA Consultancy",
        "contact_person": "MHA Talent",
        "industry": "Recruitment & Consultancy",
        "company_size": "50-200",
        "company_location": "Kuala Lumpur",
        "company_summary": (
            "MHA Consultancy delivers professional recruitment and talent solutions."
        ),
        "website": "https://mha.example.com",
    },
    {
        "slug": "woodee",
        "email": "careers@woodee.example.com",
        "company_name": "Woodee",
        "contact_person": "Woodee Talent",
        "industry": "Consumer & Lifestyle",
        "company_size": "10-50",
        "company_location": "Petaling Jaya",
        "company_summary": "Woodee creates consumer lifestyle brands and products.",
        "website": "https://woodee.example.com",
    },
    {
        "slug": "wewe",
        "email": "careers@wewe.example.com",
        "company_name": "WEWE",
        "contact_person": "WEWE Talent",
        "industry": "Digital & Media",
        "company_size": "10-50",
        "company_location": "Cyberjaya",
        "company_summary": "WEWE produces digital media and content experiences.",
        "website": "https://wewe.example.com",
    },
]

ET = Job.EmploymentType
SP = Job.SalaryPeriod

# Demo job blueprints. ``key`` is the STABLE idempotency identifier and is woven
# into the slug so re-running matches the same row. ``employer`` indexes into the
# approved employer list (or None for an MHA-direct listing). ``state`` controls
# the published/draft/closed lifecycle.
DEMO_JOBS = [
    # Aurora Bank (idx 0)
    {
        "key": "aurora-relationship-manager",
        "employer": 0,
        "title": "Relationship Manager",
        "location": "Kuala Lumpur",
        "type": ET.FULL_TIME,
        "salary": (6000, 9000),
        "state": "published",
        "requirements": "banking relationship sales finance client portfolio communication",
    },
    {
        "key": "aurora-credit-analyst",
        "employer": 0,
        "title": "Credit Risk Analyst",
        "location": "Kuala Lumpur",
        "type": ET.FULL_TIME,
        "salary": (5500, 8000),
        "state": "published",
        "requirements": "credit risk analysis finance modelling excel reporting",
    },
    {
        "key": "aurora-teller",
        "employer": 0,
        "title": "Branch Teller",
        "location": "Petaling Jaya",
        "type": ET.PART_TIME,
        "salary": None,
        "state": "published",
        "requirements": "customer service cash handling banking attention detail",
    },
    {
        "key": "aurora-intern-finance",
        "employer": 0,
        "title": "Finance Intern",
        "location": "Kuala Lumpur",
        "type": ET.INTERNSHIP,
        "salary": (1500, 2000),
        "state": "published",
        "requirements": "finance accounting excel reporting university student",
    },
    # Nimbus Technologies (idx 1)
    {
        "key": "nimbus-backend-engineer",
        "employer": 1,
        "title": "Backend Software Engineer",
        "location": "Cyberjaya",
        "type": ET.FULL_TIME,
        "salary": (7000, 11000),
        "state": "published",
        "requirements": "python django backend api postgresql docker testing software",
    },
    {
        "key": "nimbus-frontend-engineer",
        "employer": 1,
        "title": "Frontend Engineer",
        "location": "Remote",
        "type": ET.FULL_TIME,
        "salary": (6500, 10000),
        "state": "published",
        "requirements": "javascript typescript react frontend css accessibility software",
    },
    {
        "key": "nimbus-devops",
        "employer": 1,
        "title": "DevOps Engineer",
        "location": "Cyberjaya",
        "type": ET.CONTRACT,
        "salary": (8000, 12000),
        "state": "published",
        "requirements": "devops kubernetes aws ci cd terraform linux automation",
    },
    {
        "key": "nimbus-qa",
        "employer": 1,
        "title": "QA Automation Engineer",
        "location": "Remote",
        "type": ET.FULL_TIME,
        "salary": None,
        "state": "published",
        "requirements": "testing automation selenium python quality assurance software",
    },
    {
        "key": "nimbus-pm-draft",
        "employer": 1,
        "title": "Product Manager",
        "location": "Cyberjaya",
        "type": ET.FULL_TIME,
        "salary": (9000, 14000),
        "state": "draft",
        "requirements": "product management roadmap stakeholder agile delivery",
    },
    # Greenfield Logistics (idx 2)
    {
        "key": "greenfield-warehouse-supervisor",
        "employer": 2,
        "title": "Warehouse Supervisor",
        "location": "Port Klang",
        "type": ET.FULL_TIME,
        "salary": (3500, 5000),
        "state": "published",
        "requirements": "warehouse logistics supervision inventory safety operations",
    },
    {
        "key": "greenfield-driver",
        "employer": 2,
        "title": "Delivery Driver",
        "location": "Shah Alam",
        "type": ET.TEMPORARY,
        "salary": (2500, 3200),
        "state": "published",
        "requirements": "driving licence logistics delivery punctual safety",
    },
    {
        "key": "greenfield-coordinator",
        "employer": 2,
        "title": "Logistics Coordinator",
        "location": "Petaling Jaya",
        "type": ET.FULL_TIME,
        "salary": (4000, 6000),
        "state": "published",
        "requirements": "logistics coordination planning supply chain excel communication",
    },
    {
        "key": "greenfield-closed-analyst",
        "employer": 2,
        "title": "Supply Chain Analyst",
        "location": "Kuala Lumpur",
        "type": ET.FULL_TIME,
        "salary": (5000, 7000),
        "state": "closed",
        "requirements": "supply chain analysis data excel forecasting logistics",
    },
    # Coastal Retail (idx 3)
    {
        "key": "coastal-store-manager",
        "employer": 3,
        "title": "Store Manager",
        "location": "Penang",
        "type": ET.FULL_TIME,
        "salary": (4500, 6500),
        "state": "published",
        "requirements": "retail management sales team leadership customer service",
    },
    {
        "key": "coastal-merchandiser",
        "employer": 3,
        "title": "Visual Merchandiser",
        "location": "Penang",
        "type": ET.PART_TIME,
        "salary": None,
        "state": "published",
        "requirements": "retail merchandising design creative visual display",
    },
    {
        "key": "coastal-cashier",
        "employer": 3,
        "title": "Retail Cashier",
        "location": "George Town",
        "type": ET.PART_TIME,
        "salary": (1800, 2400),
        "state": "published",
        "requirements": "cashier customer service retail cash handling",
    },
    {
        "key": "coastal-buyer",
        "employer": 3,
        "title": "Category Buyer",
        "location": "Kuala Lumpur",
        "type": ET.FULL_TIME,
        "salary": (5500, 8000),
        "state": "published",
        "requirements": "retail buying procurement negotiation category analysis",
    },
    # Meridian Health (idx 4)
    {
        "key": "meridian-staff-nurse",
        "employer": 4,
        "title": "Staff Nurse",
        "location": "Johor Bahru",
        "type": ET.FULL_TIME,
        "salary": (3800, 5500),
        "state": "published",
        "requirements": "nursing patient care clinical healthcare registered communication",
    },
    {
        "key": "meridian-admin",
        "employer": 4,
        "title": "Clinic Administrator",
        "location": "Johor Bahru",
        "type": ET.FULL_TIME,
        "salary": (3000, 4200),
        "state": "published",
        "requirements": "administration scheduling healthcare records customer service",
    },
    {
        "key": "meridian-physio",
        "employer": 4,
        "title": "Physiotherapist",
        "location": "Johor Bahru",
        "type": ET.CONTRACT,
        "salary": (4500, 6500),
        "state": "published",
        "requirements": "physiotherapy rehabilitation patient care healthcare clinical",
    },
    # MHA-direct listings (employer is None)
    {
        "key": "mha-data-analyst",
        "employer": None,
        "title": "Data Analyst",
        "location": "Kuala Lumpur",
        "type": ET.FULL_TIME,
        "salary": (5000, 7500),
        "state": "published",
        "mha_supported": True,
        "requirements": "data analysis sql python reporting dashboards statistics",
    },
    {
        "key": "mha-customer-success",
        "employer": None,
        "title": "Customer Success Specialist",
        "location": "Remote",
        "type": ET.FULL_TIME,
        "salary": None,
        "state": "published",
        "mha_supported": True,
        "requirements": "customer success communication onboarding retention support",
    },
]

# Published jobs for the real partner companies so each shows an active-role
# count and qualifies for "Featured organisations". ``partner`` is the partner
# company slug; ``key`` is the stable idempotency identifier woven into the slug.
PARTNER_JOBS = [
    # Vendox
    {
        "key": "vendox-software-engineer",
        "partner": "vendox",
        "title": "Software Engineer",
        "location": "Kuala Lumpur",
        "type": ET.FULL_TIME,
        "requirements": "software engineering python javascript api backend frontend",
    },
    {
        "key": "vendox-product-designer",
        "partner": "vendox",
        "title": "Product Designer",
        "location": "Kuala Lumpur",
        "type": ET.FULL_TIME,
        "requirements": "product design ui ux figma research prototyping",
    },
    # MHA Consultancy
    {
        "key": "mha-recruitment-consultant",
        "partner": "mha",
        "title": "Recruitment Consultant",
        "location": "Kuala Lumpur",
        "type": ET.FULL_TIME,
        "requirements": "recruitment talent sourcing interviewing client communication",
    },
    {
        "key": "mha-talent-coordinator",
        "partner": "mha",
        "title": "Talent Coordinator",
        "location": "Kuala Lumpur",
        "type": ET.FULL_TIME,
        "requirements": "coordination scheduling candidate care administration communication",
    },
    # Woodee
    {
        "key": "woodee-marketing-executive",
        "partner": "woodee",
        "title": "Marketing Executive",
        "location": "Petaling Jaya",
        "type": ET.FULL_TIME,
        "requirements": "marketing brand campaigns social media content lifestyle",
    },
    # WEWE
    {
        "key": "wewe-content-producer",
        "partner": "wewe",
        "title": "Content Producer",
        "location": "Cyberjaya",
        "type": ET.FULL_TIME,
        "requirements": "content production media video editing storytelling digital",
    },
]

# Screening questions attached to a few jobs (keyed by job key for idempotency).
DEMO_SCREENING = {
    "nimbus-backend-engineer": [
        {
            "q": "How many years of Python experience do you have?",
            "type": ScreeningQuestion.QuestionType.NUMBER,
            "required": True,
        },
        {
            "q": "Are you authorised to work in Malaysia?",
            "type": ScreeningQuestion.QuestionType.YES_NO,
            "required": True,
        },
    ],
    "aurora-relationship-manager": [
        {
            "q": "Which segment have you served?",
            "type": ScreeningQuestion.QuestionType.SINGLE_CHOICE,
            "required": True,
            "options": ["Retail", "SME", "Corporate"],
        },
        {
            "q": "Briefly describe a client you grew.",
            "type": ScreeningQuestion.QuestionType.LONG_TEXT,
            "required": False,
        },
    ],
    "meridian-staff-nurse": [
        {
            "q": "Do you hold a valid nursing registration?",
            "type": ScreeningQuestion.QuestionType.YES_NO,
            "required": True,
        },
    ],
}

# A handful of published MHA market insights for the Career Intelligence Console.
DEMO_INSIGHTS = [
    {
        "title": "Roles in focus this quarter (DEMO)",
        "body": "DEMO INSIGHT — synthetic. Banking relationship and cloud-engineering "
        "roles are seeing steady demand across Klang Valley.",
        "category": MarketInsight.Category.ROLES_IN_FOCUS,
        "order": 1,
    },
    {
        "title": "Hiring outlook: cautious optimism (DEMO)",
        "body": "DEMO INSIGHT — synthetic. Employers report measured hiring plans with a "
        "focus on retention and upskilling.",
        "category": MarketInsight.Category.HIRING_OUTLOOK,
        "order": 2,
    },
    {
        "title": "Skills employers ask about (DEMO)",
        "body": "DEMO INSIGHT — synthetic. Data literacy and clear written communication "
        "recur across job requirements.",
        "category": MarketInsight.Category.SKILLS,
        "order": 3,
    },
]


# A handful of SYNTHETIC company reviews so star ratings + aggregates render on
# first run. Keyed by (company key, reviewer_email) for idempotency. ``company``
# is either a DEMO_EMPLOYERS index (int) or a PARTNER_COMPANIES slug (str). A few
# carry an employer ``reply`` so the reply UI has data. Ratings span 3-5 only —
# clearly positive synthetic content, no fabricated complaints.
DEMO_REVIEWS = [
    {
        "company": 0,  # Aurora Bank
        "reviewer_name": "Demo Reviewer A",
        "reviewer_email": "reviewer.a@example.com",
        "rating": 5,
        "title": "DEMO review — great place to grow",
        "body": "DEMO REVIEW — synthetic. Supportive managers and clear progression.",
        "reply": "DEMO REPLY — synthetic. Thank you for the kind words!",
    },
    {
        "company": 0,
        "reviewer_name": "Demo Reviewer B",
        "reviewer_email": "reviewer.b@example.com",
        "rating": 4,
        "title": "DEMO review — solid experience",
        "body": "DEMO REVIEW — synthetic. Good benefits, fast-paced environment.",
    },
    {
        "company": 1,  # Nimbus Technologies
        "reviewer_name": "Demo Reviewer C",
        "reviewer_email": "reviewer.c@example.com",
        "rating": 5,
        "title": "DEMO review — strong engineering culture",
        "body": "DEMO REVIEW — synthetic. Modern stack and thoughtful code review.",
        "reply": "DEMO REPLY — synthetic. We appreciate the feedback.",
    },
    {
        "company": 1,
        "reviewer_name": "Demo Reviewer D",
        "reviewer_email": "reviewer.d@example.com",
        "rating": 3,
        "title": "DEMO review — room to improve",
        "body": "DEMO REVIEW — synthetic. Interesting work; onboarding could be smoother.",
    },
    {
        "company": "vendox",  # partner company
        "reviewer_name": "Demo Reviewer E",
        "reviewer_email": "reviewer.e@example.com",
        "rating": 5,
        "title": "DEMO review — recommended",
        "body": "DEMO REVIEW — synthetic. Friendly team and interesting products.",
    },
    {
        "company": "woodee",  # partner company
        "reviewer_name": "Demo Reviewer F",
        "reviewer_email": "reviewer.f@example.com",
        "rating": 4,
        "title": "DEMO review — good vibes",
        "body": "DEMO REVIEW — synthetic. Creative environment with real ownership.",
    },
]


class Command(BaseCommand):
    help = "Seed an idempotent, synthetic demo dataset (spec §27). Local/demo use only."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--force",
            action="store_true",
            help="Allow running even when DEBUG is False (e.g. staging). Never use in production.",
        )

    def handle(self, *args, **options) -> None:
        if not settings.DEBUG and not options["force"]:
            raise CommandError(
                "Refusing to seed demo data when DEBUG is False. Demo credentials must "
                "never be used in production (spec §27.1). Pass --force only on a "
                "throwaway/local/staging database."
            )

        counts = self._seed()

        self.stdout.write(self.style.SUCCESS("\nDemo data seeded (idempotent)."))
        self.stdout.write("Created/ensured:")
        for label, value in counts.items():
            self.stdout.write(f"  {label:24} {value}")

        self.stdout.write(
            self.style.WARNING("\nDEMO ACCOUNTS — local/demo use ONLY, never production:")
        )
        self.stdout.write(f"  shared password: {DEMO_PASSWORD}")
        self.stdout.write(f"  administrator (superuser): {ADMIN_EMAIL}")
        self.stdout.write(f"  approved employer:         {DEMO_EMPLOYERS[0]['email']}")
        self.stdout.write(f"  pending employer:          {PENDING_EMPLOYER['email']}")
        self.stdout.write(f"  candidate (complete):      {CANDIDATE_COMPLETE_EMAIL}")
        self.stdout.write(f"  candidate (incomplete):    {CANDIDATE_INCOMPLETE_EMAIL}")
        self.stdout.write(
            self.style.WARNING(
                "\nAll data above is SYNTHETIC demo content. Do not use in production."
            )
        )

    # -- seeding steps ------------------------------------------------------

    def _seed(self) -> dict[str, int]:
        admin = self._ensure_admin()
        approved_employers = self._ensure_approved_employers(admin)
        partner_companies = self._ensure_partner_companies(admin)
        self._ensure_pending_employer()
        complete_candidate = self._ensure_complete_candidate()
        self._ensure_incomplete_candidate()
        jobs = self._ensure_jobs(admin, approved_employers)
        self._ensure_partner_jobs(partner_companies)
        self._ensure_screening(jobs)
        self._ensure_applications(complete_candidate, jobs)
        self._ensure_saved_jobs(complete_candidate, jobs)
        fits = self._ensure_job_fits(complete_candidate, jobs)
        self._ensure_support_requests(complete_candidate, jobs)
        views = self._ensure_job_views(complete_candidate, jobs)
        self._ensure_insights()
        self._ensure_reviews(approved_employers, partner_companies)

        return {
            "users": User.objects.count(),
            "employer profiles": EmployerProfile.objects.count(),
            "candidate profiles": CandidateProfile.objects.count(),
            "jobs": Job.objects.count(),
            "screening questions": ScreeningQuestion.objects.count(),
            "applications": Application.objects.count(),
            "saved jobs": complete_candidate.saved_jobs.count(),
            "job fit results": fits,
            "support requests": SupportRequest.objects.count(),
            "job view events": views,
            "market insights": MarketInsight.objects.count(),
            "company reviews": CompanyReview.objects.count(),
        }

    def _ensure_admin(self) -> User:
        user, created = User.objects.get_or_create(
            email=ADMIN_EMAIL,
            defaults={
                "role": User.Role.ADMIN,
                "status": User.Status.ACTIVE,
                "is_staff": True,
                "is_superuser": True,
                "email_verified_at": timezone.now(),
            },
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        return user

    @transaction.atomic
    def _ensure_approved_employers(self, admin: User) -> list[EmployerProfile]:
        profiles: list[EmployerProfile] = []
        for spec in DEMO_EMPLOYERS:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "role": User.Role.EMPLOYER,
                    "status": User.Status.ACTIVE,
                    "email_verified_at": timezone.now(),
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()

            profile, _ = EmployerProfile.objects.get_or_create(
                user=user,
                defaults={
                    "company_name": spec["company_name"],
                    "contact_person": spec["contact_person"],
                    "phone": "+60 3-0000 0000",
                    "company_summary": spec["company_summary"],
                    "website": spec["website"],
                    "industry": spec["industry"],
                    "company_size": spec["company_size"],
                    "company_location": spec["company_location"],
                },
            )
            # Approve through the real workflow so the state is exactly what the
            # admin action would produce (idempotent: skip if already approved).
            if not profile.is_approved:
                approval_service.approve_employer(profile, actor=admin)
            profiles.append(profile)
        return profiles

    @transaction.atomic
    def _ensure_partner_companies(self, admin: User) -> dict[str, EmployerProfile]:
        """Ensure the real MHA partner/owned brands exist as approved employers.

        Modeled on :meth:`_ensure_approved_employers` (same get_or_create-by-email
        account pattern, shared local password, verified + active employer), with
        one critical difference: the EmployerProfile is created with an EXPLICIT,
        stable ``slug`` from the spec so the frontend logo mapping stays valid
        across runs (the model only auto-generates a random slug when ``slug`` is
        blank). Returns a ``{slug: profile}`` map so partner jobs can be attached.
        """
        profiles: dict[str, EmployerProfile] = {}
        for spec in PARTNER_COMPANIES:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "role": User.Role.EMPLOYER,
                    "status": User.Status.ACTIVE,
                    "email_verified_at": timezone.now(),
                },
            )
            if created:
                user.set_password(DEMO_PASSWORD)
                user.save()

            profile, _ = EmployerProfile.objects.get_or_create(
                user=user,
                defaults={
                    "slug": spec["slug"],
                    "company_name": spec["company_name"],
                    "contact_person": spec["contact_person"],
                    "phone": "+60 3-0000 0000",
                    "company_summary": spec["company_summary"],
                    "website": spec["website"],
                    "industry": spec["industry"],
                    "company_size": spec["company_size"],
                    "company_location": spec["company_location"],
                },
            )
            # Approve through the real workflow (idempotent: skip if already done).
            if not profile.is_approved:
                approval_service.approve_employer(profile, actor=admin)
            profiles[spec["slug"]] = profile
        return profiles

    def _ensure_pending_employer(self) -> EmployerProfile:
        spec = PENDING_EMPLOYER
        user, created = User.objects.get_or_create(
            email=spec["email"],
            defaults={
                "role": User.Role.EMPLOYER,
                "status": User.Status.PENDING,
                "email_verified_at": timezone.now(),
            },
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        profile, _ = EmployerProfile.objects.get_or_create(
            user=user,
            defaults={
                "company_name": spec["company_name"],
                "contact_person": spec["contact_person"],
                "phone": "+60 3-0000 0001",
                "company_summary": spec["company_summary"],
                "website": spec["website"],
                "industry": spec["industry"],
                "company_size": spec["company_size"],
                "company_location": spec["company_location"],
                # default approval_status is PENDING — left as-is on purpose.
            },
        )
        return profile

    def _ensure_complete_candidate(self) -> CandidateProfile:
        user, created = User.objects.get_or_create(
            email=CANDIDATE_COMPLETE_EMAIL,
            defaults={
                "role": User.Role.CANDIDATE,
                "status": User.Status.ACTIVE,
                "email_verified_at": timezone.now(),
            },
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        profile, _ = CandidateProfile.objects.get_or_create(
            user=user,
            defaults={
                "full_name": "Alex Demo Candidate",
                "phone": "+60 12-000 0000",
                "preferred_job_title": "Backend Software Engineer",
                "preferred_location": "Cyberjaya",
                "preferred_employment_type": Job.EmploymentType.FULL_TIME,
            },
        )
        # Attach a synthetic resume (valid PDF) so this candidate can apply and be
        # scored. Only store one if absent (idempotent — avoids re-uploading).
        if not profile.resume_file:
            upload = _demo_upload("alex_demo_resume.pdf", _DEMO_PDF_BYTES)
            resume_service.store_resume(profile=profile, upload=upload, actor=user)
        return profile

    def _ensure_incomplete_candidate(self) -> CandidateProfile:
        user, created = User.objects.get_or_create(
            email=CANDIDATE_INCOMPLETE_EMAIL,
            defaults={
                "role": User.Role.CANDIDATE,
                "status": User.Status.ACTIVE,
                "email_verified_at": timezone.now(),
            },
        )
        if created:
            user.set_password(DEMO_PASSWORD)
            user.save()
        # Deliberately incomplete: minimal name, no preferences, no resume.
        profile, _ = CandidateProfile.objects.get_or_create(
            user=user,
            defaults={
                "full_name": "Sam Demo Newcomer",
                "phone": "",
                "preferred_job_title": "",
            },
        )
        return profile

    def _ensure_jobs(
        self, admin: User, approved_employers: list[EmployerProfile]
    ) -> dict[str, Job]:
        jobs: dict[str, Job] = {}
        for spec in DEMO_JOBS:
            employer = (
                approved_employers[spec["employer"]] if spec["employer"] is not None else None
            )
            source = (
                Job.SourceType.EMPLOYER_PARTNER
                if employer is not None
                else Job.SourceType.MHA_DIRECT
            )
            salary = spec.get("salary")
            created_by = employer.user if employer is not None else admin

            # Idempotency key: store the stable seed key inside the slug. A fresh
            # Job.save() would otherwise generate a random slug each run.
            slug = f"demo-{spec['key']}"
            job, created = Job.objects.get_or_create(
                slug=slug,
                defaults={
                    "employer": employer,
                    "created_by": created_by,
                    "source_type": source,
                    "title": spec["title"],
                    "location": spec["location"],
                    "employment_type": spec["type"],
                    "salary_min": salary[0] if salary else None,
                    "salary_max": salary[1] if salary else None,
                    "salary_disclosed": bool(salary),
                    "description": (
                        f"DEMO LISTING — synthetic. {spec['title']} role used to "
                        "demonstrate the MHA platform."
                    ),
                    "requirements": spec["requirements"],
                    "is_mha_supported": spec.get("mha_supported", False),
                    "status": Job.Status.DRAFT,
                },
            )
            if created:
                self._apply_job_state(job, spec["state"])
            jobs[spec["key"]] = job
        return jobs

    def _apply_job_state(self, job: Job, state: str) -> None:
        """Move a freshly-created DRAFT job to its target lifecycle state."""
        if state == "draft":
            return
        lifecycle.publish_job(job)
        if state == "closed":
            lifecycle.close_job(job)

    def _ensure_partner_jobs(self, partners: dict[str, EmployerProfile]) -> dict[str, Job]:
        """Give each real partner company 1-2 PUBLISHED jobs.

        Mirrors :meth:`_ensure_jobs`: a DRAFT job is created via get_or_create on a
        stable slug (so re-runs match the same row) and then moved to PUBLISHED
        through the real lifecycle service. Summaries/descriptions stay NEUTRAL —
        these are real brands, not synthetic demo companies.
        """
        jobs: dict[str, Job] = {}
        for spec in PARTNER_JOBS:
            employer = partners.get(spec["partner"])
            if employer is None:
                continue
            slug = f"partner-{spec['key']}"
            job, created = Job.objects.get_or_create(
                slug=slug,
                defaults={
                    "employer": employer,
                    "created_by": employer.user,
                    "source_type": Job.SourceType.EMPLOYER_PARTNER,
                    "title": spec["title"],
                    "location": spec["location"],
                    "employment_type": spec["type"],
                    "salary_disclosed": False,
                    "description": (f"{spec['title']} role at {employer.company_name}."),
                    "requirements": spec["requirements"],
                    "listing_language": Job.ListingLanguage.EN,
                    "status": Job.Status.DRAFT,
                },
            )
            if created:
                self._apply_job_state(job, "published")
            jobs[spec["key"]] = job
        return jobs

    def _ensure_screening(self, jobs: dict[str, Job]) -> None:
        for job_key, questions in DEMO_SCREENING.items():
            job = jobs.get(job_key)
            if job is None:
                continue
            for order, qspec in enumerate(questions):
                ScreeningQuestion.objects.get_or_create(
                    job=job,
                    question=qspec["q"],
                    defaults={
                        "question_type": qspec["type"],
                        "is_required": qspec["required"],
                        "options_json": qspec.get("options", []),
                        "display_order": order,
                    },
                )

    def _ensure_applications(self, candidate: CandidateProfile, jobs: dict[str, Job]) -> int:
        """Create applications spanning every status from the complete candidate.

        One application per status (seven total). Each goes through the apply
        service (giving it the initial APPLIED history + resume snapshot) and is
        then progressed via the status service so it carries real history rows.
        """
        # Map each target status to a published job to apply to.
        targets = [
            ("aurora-relationship-manager", ApplicationStatus.APPLIED),
            ("aurora-credit-analyst", ApplicationStatus.UNDER_REVIEW),
            ("nimbus-frontend-engineer", ApplicationStatus.SHORTLISTED),
            ("nimbus-devops", ApplicationStatus.INTERVIEW),
            ("greenfield-coordinator", ApplicationStatus.OFFERED),
            ("coastal-store-manager", ApplicationStatus.HIRED),
            ("meridian-admin", ApplicationStatus.REJECTED),
        ]
        for job_key, target_status in targets:
            job = jobs.get(job_key)
            if job is None:
                continue
            existing = Application.objects.filter(job=job, candidate=candidate).first()
            if existing is None:
                # apply_service enforces "one per job" + required screening answers.
                # Build valid answers for any required questions this job carries.
                existing = apply_service.submit_application(
                    candidate=candidate,
                    job=job,
                    cover_letter="DEMO application — synthetic candidate.",
                    answers_by_question=self._demo_answers(job),
                )
            # Progress to the target status through the real transition service
            # (idempotent: only when not already there).
            if existing.status != target_status:
                status_service.change_status(
                    application=existing,
                    new_status=target_status,
                    actor=job.created_by or candidate.user,
                    change_note="DEMO status progression.",
                )
        return Application.objects.filter(candidate=candidate).count()

    @staticmethod
    def _demo_answers(job: Job) -> dict[str, object]:
        """Produce a valid answer for each required screening question on ``job``.

        Mirrors the answer types ``apply_service`` validates (yes/no, number,
        single-choice, text) so a job with required questions can be applied to
        without hard-coding which jobs have them.
        """
        answers: dict[str, object] = {}
        for q in job.screening_questions.all():
            if not q.is_required:
                continue
            qid = str(q.id)
            if q.question_type == ScreeningQuestion.QuestionType.YES_NO:
                answers[qid] = "yes"
            elif q.question_type == ScreeningQuestion.QuestionType.NUMBER:
                answers[qid] = "5"
            elif q.question_type == ScreeningQuestion.QuestionType.SINGLE_CHOICE:
                options = q.options_json or []
                answers[qid] = options[0] if options else "N/A"
            else:  # SHORT_TEXT / LONG_TEXT
                answers[qid] = "DEMO answer — synthetic."
        return answers

    def _ensure_saved_jobs(self, candidate: CandidateProfile, jobs: dict[str, Job]) -> None:
        for job_key in ("nimbus-backend-engineer", "nimbus-qa", "mha-data-analyst"):
            job = jobs.get(job_key)
            if job is None or job.status != Job.Status.PUBLISHED:
                continue
            saved_job_service.save_job(profile=candidate, job_ref=str(job.id))

    def _ensure_job_fits(self, candidate: CandidateProfile, jobs: dict[str, Job]) -> int:
        """Compute a few Job Fit examples for the complete candidate.

        ``compute_job_fit`` upserts the single current result per (candidate, job),
        so re-running simply recomputes — never duplicates.
        """
        for job_key in (
            "nimbus-backend-engineer",
            "nimbus-frontend-engineer",
            "aurora-relationship-manager",
            "mha-data-analyst",
        ):
            job = jobs.get(job_key)
            if job is None or job.status != Job.Status.PUBLISHED:
                continue
            compute_job_fit(candidate, job)
        return candidate.job_fit_results.count()

    def _ensure_support_requests(self, candidate: CandidateProfile, jobs: dict[str, Job]) -> None:
        # A new (unhandled) candidate-linked request.
        if not SupportRequest.objects.filter(
            email=candidate.user.email, category=SupportCategory.RESUME
        ).exists():
            support_service.create_support_request(
                user=candidate.user,
                job=None,
                name=candidate.full_name,
                email=candidate.user.email,
                phone="+60 12-000 0000",
                category=SupportCategory.RESUME,
                message="DEMO support request — could you review my resume?",
            )
        # A guest request referencing a job, moved to IN_PROGRESS.
        job = jobs.get("nimbus-backend-engineer")
        guest_email = "guest.seeker@example.com"
        guest = SupportRequest.objects.filter(
            email=guest_email, category=SupportCategory.JOB_APPLICATION
        ).first()
        if guest is None:
            guest = support_service.create_support_request(
                user=None,
                job=job,
                name="Jordan Demo Guest",
                email=guest_email,
                phone="",
                category=SupportCategory.JOB_APPLICATION,
                message="DEMO support request — help applying to this role.",
            )
        if guest.status != SupportStatus.IN_PROGRESS:
            support_service.change_status(
                support_request=guest,
                new_status=SupportStatus.IN_PROGRESS,
                actor=None,
            )

    def _ensure_job_views(self, candidate: CandidateProfile, jobs: dict[str, Job]) -> int:
        """Seed a few job-view events so employer analytics has data.

        Idempotent by (job, user) for the signed-in viewer and by a stable
        synthetic ``anonymous_session_hash`` per job for anon views, so re-running
        does not inflate counts. We do not call the recording service here because
        it de-dupes on a time window (which is not re-run-stable); a direct
        get_or_create on a stable key is the honest idempotent equivalent.
        """
        view_targets = {
            "aurora-relationship-manager": 4,
            "nimbus-backend-engineer": 12,
            "nimbus-frontend-engineer": 6,
            "coastal-store-manager": 3,
        }
        for job_key, anon_count in view_targets.items():
            job = jobs.get(job_key)
            if job is None or job.status != Job.Status.PUBLISHED:
                continue
            # One signed-in candidate view.
            JobViewEvent.objects.get_or_create(
                job=job,
                user=candidate.user,
                anonymous_session_hash=None,
            )
            # Several deterministic anonymous views (stable synthetic hashes).
            for i in range(anon_count):
                JobViewEvent.objects.get_or_create(
                    job=job,
                    user=None,
                    anonymous_session_hash=f"demoseed-{job_key}-{i:03d}",
                )
        return JobViewEvent.objects.count()

    def _ensure_insights(self) -> None:
        for spec in DEMO_INSIGHTS:
            MarketInsight.objects.get_or_create(
                title=spec["title"],
                defaults={
                    "body": spec["body"],
                    "category": spec["category"],
                    "display_order": spec["order"],
                    "is_published": True,
                },
            )

    def _ensure_reviews(
        self,
        approved_employers: list[EmployerProfile],
        partner_companies: dict[str, EmployerProfile],
    ) -> None:
        """Seed synthetic public reviews (+ a couple of employer replies).

        Idempotent by (employer, reviewer_email): a review is created via the
        review service only when one with that email does not already exist for
        the company, so re-running never duplicates. Replies are upserted, so
        re-running leaves exactly one reply per replied-to review.
        """
        for spec in DEMO_REVIEWS:
            ref = spec["company"]
            if isinstance(ref, int):
                if ref >= len(approved_employers):
                    continue
                employer = approved_employers[ref]
            else:
                employer = partner_companies.get(ref)
            if employer is None:
                continue

            review = CompanyReview.objects.filter(
                employer=employer, reviewer_email=spec["reviewer_email"]
            ).first()
            if review is None:
                review = create_review(
                    employer,
                    reviewer_name=spec["reviewer_name"],
                    reviewer_email=spec["reviewer_email"],
                    rating=spec["rating"],
                    title=spec["title"],
                    body=spec["body"],
                )
            reply_body = spec.get("reply")
            if reply_body and not EmployerReply.objects.filter(review=review).exists():
                set_reply(review, author=employer.user, body=reply_body)
