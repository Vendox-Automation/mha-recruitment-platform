# ADR-0001 — Stack, Repository Structure, Authentication, and Data Strategy

- Status: Accepted (Phase 0)
- Date: 2026-06-20
- Branch: `feat/claude-full-mvp`
- Authors: Architecture planner (independent), reviewing the lead supervisor's proposal
- Supersedes: none
- Authoritative source: `docs/product/MHA_Standalone_Job_Platform_Claude_Executive_Full_Developer_Package_v1.0.md` (especially §18–22, §29, §34), `CLAUDE.md`, `AGENTS.md`

This ADR records the binding technical decisions for the MHA bilingual recruitment platform (Claude Executive Version) before any feature code is written. It validates and, where necessary, overrides the supervisor's proposed decisions. Items where the planner overrode or flagged the proposal are marked **[OVERRIDE]** or **[FLAG]** and summarised in §11.

---

## 1. Decision summary

### 1.1 Backend

| Concern | Decision | Rationale |
|---|---|---|
| Framework | Django 5.2.x LTS | Approved stack; 5.2 is the current LTS, supported on Python 3.14.3 (the only interpreter available). Verified installable in this environment. |
| API | Django REST Framework (current stable) | Approved stack; ViewSets/serializers/permissions map cleanly to §20–22. |
| Python runtime | 3.14.3 (pin `>=3.12,<3.15` in docs) | Only interpreter present. Document the floor at 3.12 so CI/other devs are not forced onto 3.14. |
| DB driver | `psycopg[binary]` (psycopg 3) | Canonical Postgres driver; binary wheel avoids a local C toolchain. SQLite driver is stdlib (local fallback only — see §6). |
| DB URL config | `dj-database-url` | Single `DATABASE_URL` switches Postgres/SQLite without code changes (§6). |
| Env loading | `python-dotenv` **[OVERRIDE]** | Supervisor offered "django-environ or python-dotenv". Choose `python-dotenv` only, read into explicit typed settings helpers. Reason: `django-environ` bundles its own URL parsing that overlaps `dj-database-url`; using both invites two sources of truth for `DATABASE_URL`. One loader + one URL parser is cleaner. |
| CORS | `django-cors-headers` | Cross-origin dev between Next.js (`:3000`) and Django (`:8000`); strict allowlist (§4). |
| AuthN transport | DRF `SessionAuthentication` + Django session cookie (HttpOnly, SameSite) + CSRF | Satisfies §11/§19.2 "no long-lived token in browser storage". See §4 for the override on the refresh endpoint. |
| Throttling | DRF `ScopedRateThrottle` + Anon/User throttles | §22.5 rate limiting on auth and public forms. Scopes: `auth`, `register`, `support`, `password_reset`. |
| Dependency mgmt | pip + `requirements.txt` (prod) + `requirements-dev.txt` (dev) | Poetry not available; pin exact versions, dev file uses `-r requirements.txt`. |
| App layout | `config/` + `apps/{accounts,candidates,employers,jobs,applications,matching,support,analytics,audit}` | Matches §18.5 exactly. |
| User model | Custom UUID `accounts.User`, `AbstractBaseUser` + `PermissionsMixin`, email login | Mandatory before first migration (§8, §19.3). See §8 of this ADR. |
| Service layer | Per-app `services/` for multi-step workflows (approval, application submit, fit calc, resume replace) | §18.3 / §18.7 keep views/serializers thin. Do not create empty layers (§18.7). |

### 1.2 Frontend

| Concern | Decision | Rationale |
|---|---|---|
| Framework | Next.js (latest stable) App Router + TypeScript | Approved stack; Node 24.17 / npm 11.13 verified. |
| i18n | `next-intl` with locale-prefixed routing `/[locale]/...`, locales `en` and `zh-CN` | §14, §18.6. Locale segment is the routing root. |
| Styling/tokens | Tailwind CSS driven by CSS custom properties for the §12.3 semantic tokens **[FLAG]** | Tailwind utilities must reference semantic CSS variables (e.g. `bg-[var(--surface-raised)]` via mapped theme keys), NOT raw hex. Reason: §12.3 forbids scattering raw colour and requires light/inverse sections from one token source. Provisional hex only; never invent final brand values (§8 design contract). |
| Forms | `react-hook-form` + `zod` | Schema validation co-located in `features/<x>/schemas`. |
| Data fetching | TanStack Query over a single central API client | §18.7.13 forbids scattered `fetch`. One client owns base URL, credentials, CSRF header, error normalisation. |
| Motion | `framer-motion` only — the single motion library | §8 "one approved motion library"; calm operational screens, refined public motion. |
| Charts | Lightweight SVG / accessible chart approach (no heavy charting dependency in MVP) | §18.2 accessible SVG; analytics must include text/data summaries (§15). Defer library choice until Phase 9/10 need is proven. |
| Unit/component tests | Vitest + React Testing Library | Fast, ESM-native. |
| E2E | Playwright (introduced later, Phase 6+) | Core-journey e2e per §18 validation gates; not needed for Phase 0. |

### 1.3 Cross-cutting

- API version prefix: `/api/v1/` (§21).
- Private resume media: stored outside public static, served only through permission-checked Django views (§22.2, §1.5 of this ADR).
- Canonical DB: PostgreSQL. Local fallback in THIS environment: SQLite via `DATABASE_URL` (§6).
- Email backend (dev): console/file backend (§18.1); password-reset and verification tokens are real, delivery is local-only.

---

## 2. Alternatives considered and why rejected

| Area | Alternative | Verdict |
|---|---|---|
| AuthN | JWT in `localStorage` (e.g. SimpleJWT default usage) | Rejected. Directly violates §11 / §19.2 / CLAUDE.md non-negotiable rule. |
| AuthN | JWT access token in memory + HttpOnly refresh cookie | Rejected for MVP. More moving parts (silent refresh, rotation, blacklist) than session cookies, with no MVP benefit since frontend and backend are co-deployed behind one origin in production. Session auth is simpler and equally compliant. Revisit only if a non-browser/mobile client appears. |
| Env config | `django-environ` (full) | Rejected as sole/added loader; overlaps `dj-database-url`. See §1.1 override. |
| DB driver | `psycopg2-binary` | Rejected. psycopg 3 (`psycopg[binary]`) is the supported path on Django 5.2 + Python 3.14; psycopg2 wheel availability on 3.14 is risky. |
| Dependency mgmt | Poetry / PDM | Rejected. Not installed; pip + pinned requirements is the agreed approach. |
| Styling | CSS Modules / vanilla-extract / styled-components | Rejected. Tailwind + CSS-variable tokens gives the §12.3 semantic system with least ceremony and best dashboard/table ergonomics. |
| Data fetching | SWR / bare `fetch` in components | Rejected. TanStack Query gives caching, mutation, and consistent loading/error/empty states (§18.7, Definition of Done §31). |
| i18n | `next-i18next` / hand-rolled | Rejected. `next-intl` is the App-Router-native choice with locale-prefixed routing and message catalogues. |
| Motion | GSAP + framer-motion | Rejected. Spec mandates ONE motion library (§8). |
| Repo shape | Two separate repositories | Rejected. §18.4 / AGENTS.md §16 require a monorepo-style single repo with `frontend/` and `backend/`. |
| Resume storage | S3/object storage with signed URLs | Deferred (future-ready, not MVP). Local private storage + permission-checked view satisfies §22.2 for development; the view abstraction lets storage swap later. |
| Background work | Celery + broker | Rejected for MVP (overengineering, no broker available). See §9 background-work boundary. |

---

## 3. Repository / folder ownership map

Top-level (AGENTS.md §16):

```text
.claude/            # agent definitions (existing)
.github/            # workflows, PR template
backend/            # Django + DRF (Django backend engineer)
frontend/           # Next.js (Next.js frontend engineer)
docs/               # specification + architecture (this file)
scripts/            # local dev/seed helper scripts
CLAUDE.md  AGENTS.md  README.md
docker-compose.yml  .env.example
```

### 3.1 Backend ownership (per §18.5 / §18.7)

```text
backend/
  config/                 # settings (base/dev/test split), root urls, wsgi/asgi
  apps/
    accounts/             # OWNS: User model, auth endpoints, sessions, /auth/me, password reset
    candidates/           # OWNS: CandidateProfile, resume metadata, saved jobs, candidate dashboard
    employers/            # OWNS: EmployerProfile, approval lifecycle, employer dashboard/analytics shell
    jobs/                 # OWNS: Job, ScreeningQuestion, slugs, search, public job/company APIs
    applications/         # OWNS: Application, ApplicationAnswer, ApplicationStatusHistory
    matching/             # OWNS: JobFitResult, rule engine, provider-neutral AI explanation service
    support/              # OWNS: SupportRequest workflow
    analytics/            # OWNS: JobViewEvent, public insights, aggregate analytics
    audit/                # OWNS: AuditLog + helper to record sensitive actions
```

Per-app internal layout (use only the layers a given app needs; do not create empty layers — §18.7):

```text
apps/<app>/
  models/ or models.py    # domain models for this app only
  serializers/            # API validation + representation
  services/               # multi-step business workflows
  permissions/            # object-level policies
  selectors/ (optional)   # reusable scoped queries
  api/                    # viewsets/views + urls.py
  migrations/             # owned by this app
  management/commands/    # e.g. seed (lives in the owning app)
  tests/                  # tests for this app
```

Cross-app dependency direction (no cycles — §18.7):

```text
accounts  <-  candidates, employers          (profiles point at User)
jobs      <-  applications, matching, analytics
candidates, jobs  <-  applications
applications, candidates, jobs  <-  matching
audit  <-  (written to by employers, applications, accounts; depends on nothing)
```

`audit` is a leaf with no domain dependencies; everything may write to it via a thin service. `accounts` must not import from feature apps.

### 3.2 Frontend ownership (per §18.6 / §18.7)

```text
frontend/src/
  app/[locale]/
    (public)/             # homepage, job search, job detail, companies, support, sign-in, registration
    candidate/            # candidate dashboard + protected candidate routes
    employer/             # employer dashboard + protected employer routes
  components/
    ui/                   # generic primitives (buttons, inputs, dialog, states)
    layout/               # header, footer, shells
    intelligence/         # Career Intelligence Console presentation pieces
  features/
    auth/  jobs/  applications/  employers/  candidates/  matching/  support/  analytics/
      components/ hooks/ schemas/ services/ types/   # per feature, as needed
  lib/
    api/                  # single API client + endpoint modules + error normalisation
    auth/                 # session/CSRF helpers, route guards
    i18n/                 # next-intl config, locale negotiation
    validation/           # shared zod helpers
  messages/               # en.json, zh-CN.json (keys kept in parity)
  styles/                 # token CSS variables + Tailwind layer
  types/                  # truly global types only
```

Ownership rules enforced: generic visuals in `components/ui`; feature components in `features/<x>`; no raw `fetch` outside `lib/api`; business rules never duplicated in React (authoritative logic is Django, §10); page/route files are composition only (§18.7.11).

### 3.3 Agent write-ownership (AGENTS.md §6.1 — no overlapping writers)

- Django backend engineer: `backend/**` (and `docker-compose.yml` DB service).
- Next.js frontend engineer: `frontend/**`.
- UI/UX specialist: `frontend/src/styles`, `components/ui`, `components/layout`, `components/intelligence`.
- Reviewers (security, testing, a11y/i18n, visual QA, repo quality, release): read-only; report to supervisor (AGENTS.md §6.3/§6.4).
- Architecture planner: `docs/architecture/**` only.

---

## 4. Authentication and session architecture

Decision: Django session authentication with an HttpOnly session cookie + CSRF, exposed through DRF `SessionAuthentication`. No JWT, no token in `localStorage`/`sessionStorage` (§11, §19.2).

### 4.1 Cookie/CSRF flow (Next.js ⇄ Django)

1. Client app boot or pre-mutation: `GET /api/v1/auth/csrf/` (or any safe GET) so Django sets the `csrftoken` cookie. **[OVERRIDE]** The spec's `POST /api/v1/auth/refresh/` (§21.1) is **repurposed** under session auth: there is no token to refresh, so this endpoint becomes a CSRF-priming / session-revalidation endpoint (returns current `/auth/me` state and ensures a fresh CSRF cookie). It MUST remain in the route list for contract stability but MUST NOT mint long-lived tokens. Document this clearly so it is not mistaken for JWT refresh.
2. `POST /api/v1/auth/login/` with credentials + `X-CSRFToken` header. On success Django issues the HttpOnly session cookie and **rotates the session** (§11 session rotation on auth via `login()` cycling the key).
3. Authenticated requests send the session cookie automatically (`credentials: 'include'`). Unsafe methods (POST/PATCH/DELETE) include the `X-CSRFToken` header read from the `csrftoken` cookie by the central API client.
4. `POST /api/v1/auth/logout/` clears the session server-side (§11 secure logout).
5. `GET /api/v1/auth/me/` is the single source of session/role/status truth for the frontend; route guards in `lib/auth` consume it. Frontend guards are UX only — every sensitive query is server-scoped (§10).

Status-aware access (§11): `/auth/me` and DRF permissions surface `role` (CANDIDATE / EMPLOYER / ADMIN) and `status` (ACTIVE / PENDING / SUSPENDED / DEACTIVATED) plus employer `approval_status`. Custom DRF permission classes reject suspended/rejected/pending where the action requires it (e.g. pending employer cannot publish — §30.3). All six boundaries are tested (§11): candidate, pending employer, approved employer, rejected employer, suspended employer, administrator.

### 4.2 Cookie attributes

- Dev: `Secure=False` (HTTP localhost), `HttpOnly=True`, `SameSite=Lax`.
- Prod: `Secure=True`, `HttpOnly=True`, `SameSite` per deployment topology; **prefer same-site/same-origin deployment** (frontend reverse-proxied in front of `/api`) so `SameSite=Lax` holds and CORS credentials complexity disappears. If split-domain is required in production, that is a separate ADR (cross-site cookies + `SameSite=None; Secure`).

### 4.3 Dev CORS / trusted origins

- `CORS_ALLOWED_ORIGINS = [http://localhost:3000, http://127.0.0.1:3000]` (strict allowlist, §22.5).
- `CORS_ALLOW_CREDENTIALS = True` (cookies must cross origin in dev).
- `CSRF_TRUSTED_ORIGINS` includes the same frontend origins.
- All origins/URLs come from env vars (`FRONTEND_ORIGIN`, `BACKEND_ORIGIN`); nothing hardcoded (§18.7.14, §19.2).

### 4.4 Throttling

DRF throttles on: `auth` (login), `register`, `password_reset`, `support`. Anonymous and user default rates set in settings; scopes applied per view (§22.5, §21.10 rate-limit responses).

---

## 5. Private file / resume architecture

Requirements: §12 (AGENTS), §22.2. Resumes (PDF/DOCX, ≤5 MB) are private and never reachable via a public/predictable URL.

Decision:

1. Storage location: a private directory OUTSIDE Django `STATIC`/public `MEDIA` serving (e.g. `backend/private_media/resumes/`), git-ignored, never mapped to a static route.
2. Server-side filenames: store under a generated UUID/opaque name; keep `resume_original_name` separately for display (§20.2). Prevents path traversal and enumeration.
3. Upload validation (a single `candidates/services/resume_service.py`): extension allowlist (`.pdf`, `.docx`), MIME/content sniff, size ≤ 5 MB, reject executables/archives, reject unsafe HTML rendering (§22.2). Validation lives in the service, not the view.
4. Access: a dedicated permission-checked download/preview view (e.g. `GET /api/v1/candidate/resume/` for owner; employer access only to a resume attached to an application for a job the employer owns). Every call runs object-level authorization (§22.1) and may emit an `AuditLog` access event (§12 AGENTS, §20.13). No `FileField.url` is ever exposed to clients.
5. Application snapshot: `Application.resume_file_snapshot` (§20.6) captures the resume at submission so later candidate replacement does not alter past applications; the snapshot obeys the same private-access rules.
6. Cross-tenant safety tested: cross-candidate and cross-employer resume access is denied and covered by tests (§30.6, AGENTS §12).
7. Future-ready: the view+service indirection means swapping local storage for signed object-storage URLs later requires no API contract change.

---

## 6. Database strategy — PostgreSQL canonical, SQLite local fallback

Context: PostgreSQL and Docker are NOT installed in this environment; only Python 3.14.3 + SQLite (stdlib) are available. PostgreSQL remains the approved, canonical, documented production database.

Decision:

1. Canonical DB is PostgreSQL. `docker-compose.yml` ships a `postgres` service; `requirements.txt` pins `psycopg[binary]`; settings read `DATABASE_URL` via `dj-database-url`.
2. `.env.example` documents the Postgres URL as the canonical value, e.g. `DATABASE_URL=postgresql://mha:mha@localhost:5432/mha`.
3. Local fallback in THIS environment only: set `DATABASE_URL=sqlite:///./backend/db.sqlite3` to run migrations and tests without Postgres. This is an agreed, honest substitute — it is NOT a stack change and NOT the production target.
4. The substitution is invisible to application code: code depends only on `DATABASE_URL`. No conditional `if sqlite` branches in domain code.
5. CI / production must use Postgres. The Phase 0 docs and README state this explicitly; the migration-from-clean-DB gate (§18 validation) should be run against Postgres at least once before final merge if a Postgres instance becomes available, and the limitation noted in the final report if it does not.

### 6.1 Postgres-portability rules (mandatory for all engineers)

To keep SQLite-run code faithful to Postgres:

1. No SQLite-only or vendor-locking SQL; use the Django ORM. Avoid `.extra()` and raw SQL except where portable and reviewed.
2. JSON fields: use `django.db.models.JSONField` (the cross-backend field), never `django.contrib.postgres.fields.JSONField`. Do not rely on JSON-path query operators that differ across backends; filter JSON in Python or with portable lookups only. (`*_json` fields in §20: `options_json`, `answer_json`, `matched/gaps/unknown_json`, `metadata_json`, `resume_extracted_keywords_json`.)
3. Avoid `django.contrib.postgres` features entirely in the MVP: `ArrayField`, `HStoreField`, `SearchVector`/full-text search, trigram, range types, `ExclusionConstraint`. Implement search (§21.4) with portable `icontains`/`Q` filtering for the MVP; a Postgres FTS upgrade is a later, documented enhancement.
4. Keep field types portable: `CharField`/`TextField`/`SlugField`/`EmailField`/`UUIDField`/`Decimal`/`DateTime` only. Use `DecimalField` (not float) for salary (§20.4 `salary_min/max`).
5. UUID primary keys: `UUIDField(primary_key=True, default=uuid4)` works on both backends; do not depend on Postgres `gen_random_uuid()` server defaults.
6. Constraints: express uniqueness via `UniqueConstraint`/`unique_together` at the ORM level so both backends enforce them — `(job_id, candidate_id)` on Application (§20.6) and `(candidate_id, job_id)` on SavedJob (§20.9).
7. Case-sensitivity: SQLite `LIKE` is case-insensitive by default while Postgres is not; always use explicit `__iexact`/`__icontains` where case-insensitive matching is intended (email uniqueness handled by normalising email to lowercase on save, not by relying on collation).
8. Transactions/atomicity: wrap multi-write workflows in `transaction.atomic()`; do not rely on backend-specific isolation behaviour.
9. Migrations must be backend-neutral; no `RunSQL` with vendor syntax. Run `makemigrations --check` (drift gate) and apply from a clean DB on both backends where feasible.

---

## 7. API contract conventions

Base: `/api/v1/` (§21). REST, JSON, DRF serializers with explicit fields (no `__all__`) to prevent field leakage (§22.1).

### 7.1 Pagination

- Default: page-number pagination, fixed `PAGE_SIZE` (e.g. 20), `page`/`page_size` query params with a capped maximum.
- Envelope: `{ "count", "next", "previous", "results": [...] }` (DRF standard). All list endpoints (jobs, applications, companies, saved jobs, support requests) paginate consistently (§21.10).

### 7.2 Error shape (binding — §21.10)

All non-2xx responses use one normalised shape. A DRF custom exception handler produces:

```json
{
  "code": "validation_error",
  "message": "Please review the highlighted fields.",
  "fields": {
    "email": ["Enter a valid work email address."]
  },
  "request_id": "..."
}
```

- `code`: stable machine string — `validation_error`, `permission_denied`, `not_found`, `authentication_required`, `throttled`, `conflict` (e.g. duplicate application), `server_error`.
- `message`: human, locale-aware top-level summary.
- `fields`: present only for field validation errors; map of field → list of messages.
- `request_id`: correlation id echoed in logs (§21.10 request identifiers for troubleshooting). Generated per request via middleware and returned in body + `X-Request-ID` header.

The frontend central API client (`lib/api`) parses this shape into typed errors so every screen can render loading/empty/error/permission-denied/success states uniformly (§31, CLAUDE.md user-state rule).

### 7.3 Locale-aware messages

- Client sends `Accept-Language` (derived from the active `/[locale]` segment); Django activates the matching locale (`en`, `zh-CN`) and returns translated `message`/`fields` text via `gettext` (§14, §21.10).
- Server-authored job/company content is returned in the language it was entered and is NOT machine-translated (§14).
- Translation keys kept in parity across `en` and `zh-CN`; validation, loading, empty, success, error, and permission states are all translated (§14). i18n is built continuously, not deferred to Phase 11 (§14 "do not postpone").

### 7.4 Conventions

- Trailing slashes on endpoints (Django default), consistent with §21 listings.
- Mutating verbs map to POST sub-routes for lifecycle actions (`/publish/`, `/close/`, `/reopen/`, `/regenerate/`) as the spec specifies (§21.4, §21.6).
- Object lookups by `slug` for public jobs/companies (SEO + non-enumerable), by `id` (UUID) for owner/admin scopes (§20.4).

---

## 8. Migration implications — custom user model before first migration

This is the single highest-risk ordering constraint and is binding.

1. `accounts.User` (custom, UUID PK, email-as-username, `role`/`status`/`preferred_locale`/`email_verified_at` per §19.3) MUST exist and `AUTH_USER_MODEL = "accounts.User"` MUST be set in settings **before the very first `migrate`**. Changing `AUTH_USER_MODEL` after initial migrations is effectively unsupported by Django and would force a destructive reset.
2. Phase-0/early-Phase-2 sequence:
   a. Create Django project + `config` settings with `INSTALLED_APPS` including `accounts` and `AUTH_USER_MODEL = "accounts.User"`.
   b. Define the `User` model and its manager.
   c. Only then run the first `makemigrations`/`migrate`.
3. Profiles (`CandidateProfile`, `EmployerProfile`) reference `accounts.User` via `OneToOneField` with `on_delete` and `settings.AUTH_USER_MODEL` (never a hardcoded import) to avoid app-load cycles.
4. UUID PKs everywhere user-facing/enumerable to prevent ID-based leakage (§22.1) and keep Postgres/SQLite parity (§6.1.5).
5. Drift gate: `makemigrations --check --dry-run` must report no missing migrations at every checkpoint (§18). Migrations live in each owning app's `migrations/` (§18.7).
6. Initial-migration smoke: applying all migrations from an empty DB must succeed on the local SQLite fallback now, and on Postgres before final merge if an instance is available (§6.5).
7. Email uniqueness normalised at the model/manager level (lowercase) rather than relying on DB collation (§6.1.7).

---

## 9. Phase sequencing, dependencies, risks

### 9.1 Approved order (AGENTS §7 / spec §29) and validation

The approved Phase 0–12 order is sound and is accepted. Notes and the one adjustment:

- **[FLAG] Phase 1 before Phase 2.** The spec runs the design/localisation shell (Phase 1) before Django core/auth (Phase 2). This is acceptable because Phase 1 is explicitly static-shell only ("do not connect to real APIs yet", §34 Prompt 1). The supervisor may, per AGENTS §7 "adjust technical order without omitting scope", choose to stand up the Django project skeleton + custom user model (the §8 constraint) as part of Phase 0/early so the irreversible `AUTH_USER_MODEL` decision is locked before any DB exists. Recommended: scaffold both `frontend/` and `backend/` shells in Phase 0; create the custom user model at the start of Phase 2 but never run `migrate` before it exists.
- i18n is continuous from Phase 1, not concentrated in Phase 11 (§14). Phase 11 is completion/native review, not first translation.
- Resume security (Phase 5) and object-level auth (Phase 7) each carry a mandatory independent security review (AGENTS §6.4) before their checkpoint.

### 9.2 Dependency chain (build order within the approved phases)

```text
accounts(User, auth)  ->  employers(approval) & candidates(profile/resume)
jobs(+screening, search)  ->  applications(+answers, status history, snapshot)
applications + candidates + jobs  ->  matching(job fit)
jobs/applications  ->  analytics(view events, insights) & support
audit  ->  written from accounts/employers/applications throughout
```

### 9.3 Background-work boundary (no overengineering)

- MVP has NO Celery/broker. The only naturally async needs are: email (dev console backend — synchronous is fine), resume keyword extraction (`resume_parsing_status` §20.2), and Job Fit generation (§20.11).
- Decision: run these synchronously inside request/transaction for the MVP, with status fields (`resume_parsing_status`, `JobFitResult.generated_at`) modelled so a future async worker can be slotted in without schema change. Provider-neutral AI explanation (§34 Phase 8) is an injectable service with a no-AI fallback (§22.3 "AI explanation can be disabled without losing core functionality"). This keeps the door open without standing up infrastructure that does not exist locally.

### 9.4 Risks and mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Postgres never exercised locally; SQLite masks a Postgres-only failure | High | §6.1 portability rules; run the clean-DB migration + test gate on Postgres before final merge if any instance is reachable; otherwise record as an honest known limitation in the final report. |
| `AUTH_USER_MODEL` set after first migrate | High | §8 ordering rule; no `migrate` before `accounts.User` exists. |
| Python 3.14 dependency wheels (DRF, psycopg, libs) immature | Medium | Pin verified versions; CI floor at 3.12 so the project is not 3.14-only; surface any incompatible package at the Phase-0 health check. |
| Search built on Postgres FTS would break SQLite parity | Medium | MVP search uses portable `icontains`/`Q`; FTS is a later documented enhancement (§6.1.3). |
| Session-cookie CORS in split-domain prod | Medium | Prefer same-origin prod deploy (§4.2); cross-site cookies deferred to a separate ADR. |
| Repurposed `/auth/refresh/` mistaken for JWT refresh | Low | Documented in §4.1; endpoint must never mint long-lived tokens. |
| Token in localStorage creeping in via a library default | Medium | Session auth only; central API client owns credentials; security reviewer checks (AGENTS §11/§6.4). |
| Empty architectural layers created "for appearance" | Low | §18.7: only add `services/selectors/permissions` when used. |

---

## 10. File ownership (this ADR)

- This ADR is owned by the architecture planner and lives at `docs/architecture/ADR-0001-stack-and-structure.md`.
- It is the binding reference for Phase 0 review (spec §29 "no feature code until architecture is reviewed").
- Future stack/structure changes require a new ADR (ADR-0002, …) referencing this one; do not silently edit accepted decisions.

---

## 11. Decisions where the planner overrode or flagged the supervisor

- **[OVERRIDE] Env loader:** use `python-dotenv` only (not `django-environ`), to avoid two `DATABASE_URL` parsers alongside `dj-database-url`. (§1.1, §2)
- **[OVERRIDE] `/api/v1/auth/refresh/`:** under session auth there is no token to refresh. The endpoint is retained for contract stability but repurposed as a CSRF-prime / session-revalidate endpoint and must never mint long-lived tokens. (§4.1)
- **[FLAG] Tailwind tokens:** accepted, but Tailwind MUST be wired to the §12.3 semantic CSS variables — no raw hex in components; provisional brand values only, never invented finals. (§1.2)
- **[FLAG] Phase 1 vs Phase 2 ordering / user model:** accepted as-is, but the custom user model (§8 irreversible constraint) should be created before any `migrate`; supervisor may scaffold the Django skeleton in Phase 0. (§9.1)
- **Confirmed without change:** Django 5.2 LTS + DRF, `psycopg[binary]`, `dj-database-url`, session auth + CSRF + HttpOnly cookies (no localStorage tokens), DRF throttling, pip + requirements files, §18.5 app layout, custom UUID user before first migration, Next.js App Router + TS, next-intl (`en`/`zh-CN`), react-hook-form + zod, TanStack Query, framer-motion as the single motion library, Vitest/RTL + Playwright-later, `/api/v1/`, private permission-checked resume serving, Postgres-canonical + SQLite-local dual DB.

---

## 12. Acceptance checks for Phase 0

Phase 0 is complete when ALL of the following hold (mapped to §29 Phase 0, §31, §34 Prompt 0):

1. Monorepo structure exists exactly per §16 / §18.4: `frontend/`, `backend/`, `docs/`, `scripts/`, `.github/`, `docker-compose.yml`, `.env.example`, `README.md`; root contains no feature code (§18.7.2).
2. This ADR is present and reviewed; no product feature code has been added (Phase 0 checkpoint).
3. Backend skeleton: Django project under `backend/config` + `apps/` packages created for the nine §18.5 domains (may be empty app shells, no domain models yet except the user model decision recorded — model itself is created in Phase 2 before first migrate).
4. `AUTH_USER_MODEL` decision documented; settings split (base/dev/test) reads `DATABASE_URL` via `dj-database-url`; `python-dotenv` loads env.
5. `requirements.txt` + `requirements-dev.txt` pin Django 5.2.x, DRF, `psycopg[binary]`, `dj-database-url`, `django-cors-headers`, `python-dotenv`; install succeeds on Python 3.14.3.
6. `docker-compose.yml` defines a `postgres` service; `.env.example` documents the canonical Postgres `DATABASE_URL` and notes the SQLite fallback for this environment.
7. Frontend skeleton: Next.js App Router + TS builds; `next-intl` locale routing scaffolded for `en` and `zh-CN`; Tailwind wired to semantic CSS-variable tokens (provisional); `lib/api` central client stub present.
8. Linting/formatting configured both sides (e.g. ruff/black or equivalent for Python; ESLint + Prettier for TS) and run clean.
9. Health checks pass: backend `manage.py check` clean and a `/api/v1/health/` (or equivalent) responds; frontend dev server + production build succeed.
10. Migration sanity: `makemigrations --check` clean; `migrate` from empty DB succeeds on the SQLite fallback (Postgres run deferred per §6.5 and noted).
11. README documents exact local startup commands (backend, frontend, db), required env vars, and the dual-DB note (§34 Prompt 0).
12. `.gitignore` excludes `node_modules`, venv, build output, `private_media/`, `*.sqlite3`, `.env` and local secrets (§18.7.15).
13. Changed-file report produced; no temporary/duplicate/backup/abandoned files remain (§18.7, §31).
14. All Phase-0 commits follow the commit convention (`type(module): ...`, <72 chars) and the branch is pushed to `origin/feat/claude-full-mvp` (AGENTS §17).

---

## 13. Verdict on the proposed architecture

**PASS** (with the two overrides and two flags in §11 adopted).

The supervisor's proposed stack and structure are consistent with the approved stack (CLAUDE.md / AGENTS §4), the spec's technical architecture (§18–22), security and privacy non-negotiables (§11, §12, §22), and the environment constraints (Python 3.14-only, no local Postgres/Docker). With the `python-dotenv`-only env loader, the explicit repurposing of `/auth/refresh/` under session auth, Tailwind bound to semantic tokens, and the custom user model created before the first migration, the architecture is sound, MVP-sized, future-ready, and testable. Phase 0 may proceed.
