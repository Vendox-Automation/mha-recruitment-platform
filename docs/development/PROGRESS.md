# Implementation Progress Log

Durable checkpoint record for the autonomous MVP build on `feat/claude-full-mvp`.
Each phase records scope, validation, independent review, and the push checkpoint.

## Phase 0 — Repository & environment bootstrap ✅

- **Scope:** Monorepo structure (`backend/`, `frontend/`, `scripts/`, `.github/`,
  `docs/architecture/`). Django 5.2 + DRF backend skeleton (`config/` settings
  split, nine domain apps, custom UUID `accounts.User` created before first
  migration per ADR §8, normalised API error envelope, request-id middleware,
  health endpoint). Next.js 16 + TS frontend skeleton (next-intl locale routing
  `en`/`zh-CN`, semantic design tokens, central API client). Tooling:
  docker-compose Postgres, pinned requirements, ruff, ESLint, commit-msg
  validator + hook, CI (backend on PostgreSQL + frontend build), PR template.
- **Architecture review:** ADR-0001 accepted (PASS).
- **Validation:** backend ruff/format/check/migrate/pytest (7 passed) green;
  frontend lint/typecheck/build green; clean-DB migrate + tests pass on
  PostgreSQL in CI (run 27874080229, both jobs success).
- **Repository-quality review:** PASS, no blockers.
- **Checkpoint:** pushed to `origin/feat/claude-full-mvp`.

## Phase 1 — Design system & localisation shell ✅

- **Scope:** Semantic design-token system + typography scale + CSS-only motion
  with reduced-motion fallback. Accessible UI primitives (Button, Input,
  Textarea, Select, Checkbox, Radio, Label, Field, Card, Badge, Tag, Alert,
  Skeleton, Spinner, five user-facing StateBlocks, SkipToContent,
  VisuallyHidden). Global chrome (PublicHeader with accessible mobile menu,
  PublicFooter, route-preserving LocaleSwitcher, DashboardShell, Wordmark) and
  Career Intelligence Console presentation pieces with honest source labels.
  Static shells for all 13 public + 8 candidate + 10 employer routes (locale
  groups). 10 translation namespaces in English and Simplified Chinese at full
  key parity. No real API calls, no fabricated data.
- **Validation:** eslint, tsc, and production build (53 static pages, both
  locales) all green; i18n parity verified by script.
- **Accessibility & localisation review:** 4 blockers found and resolved
  (missing h1 on company detail; provisional-token contrast for muted text,
  input borders, and warning badge — darkened to meet AA); structural a11y and
  full EN/zh-CN parity confirmed PASS.
- **Visual check:** homepage inspected live at desktop and narrow widths in EN
  and zh-CN (lang=zh-Hans correct, Chinese typography clean, executive
  composition delivered). Full route-sweep visual QA deferred to Phase 10/12.
- **Checkpoint:** pushed to `origin/feat/claude-full-mvp`.

## Phase 2 — Django core & authentication ✅

- **Scope (backend):** CandidateProfile + EmployerProfile models (full §20.2/§20.3
  schemas, migrations). Session-cookie auth API under `/api/v1/auth/`:
  candidate/employer registration (atomic user+profile, auto-login, console
  verification email), login/logout/me/refresh/csrf, password-reset
  request+confirm, email-verification foundation. Role/status permission classes.
  Status is the lifecycle source of truth — `DEACTIVATED` syncs `is_active=False`;
  DB-level case-insensitive email uniqueness constraint. No long-lived tokens in
  any response body.
- **Scope (frontend):** central auth service + TanStack Query session provider
  (`["me"]`), react-hook-form + zod wiring for sign-in / candidate stepper /
  employer registration / password-reset request, role-aware post-login
  redirects, route guards for candidate & employer areas (pending employer →
  pending screen), sign-out. No token in localStorage/sessionStorage. Vitest +
  RTL test harness added.
- **Validation:** backend ruff/check/drift/migrate green, 50 pytest passing;
  frontend lint/typecheck/build (55 pages) green, 16 Vitest tests passing; i18n
  parity maintained.
- **Security review:** PASS, no blockers; two priority recommendations
  (is_active sync, DB-level email uniqueness) implemented immediately.
- **Checkpoint:** pushed to `origin/feat/claude-full-mvp` (backend + frontend).

## Phase 3 — Employer approval ✅

- **Scope (backend):** AuditLog model + append-only admin + single `record_action`
  write path. Approval service (approve/reject/suspend/restore) — atomic, syncs
  employer `approval_status` + `user.status`/`is_active`, writes one audit entry,
  sends approval/rejection emails (console). Django Admin approval actions
  (bulk + reject-with-reason) routed through the service. Employer API:
  GET/PATCH `/employer/profile/` (own profile only, approval fields read-only),
  GET `/employer/approval-status/`.
- **Scope (frontend):** `/employer/pending` state-branching view (PENDING editable
  details + next step + contact MHA; REJECTED reason + resubmit; SUSPENDED
  notice), approved-only `/employer/company-profile` editor, both over the
  approval API. EN/zh-CN parity maintained.
- **Validation:** backend ruff/check/drift/migrate green, 81 pytest passing;
  frontend lint/typecheck/build (55 pages) green, 24 Vitest tests passing.
- **Security review:** PASS, no blockers (employer isolation by construction,
  approval fields non-settable, audit append-only, status sync correct); 3 minor
  recommendations deferred (profile-endpoint throttle, a CSRF assertion test,
  lingering suspend reason).
- **Checkpoint:** pushed to `origin/feat/claude-full-mvp`.

## Phase 4 — Jobs, companies & search ✅

- **Scope (backend):** Job + ScreeningQuestion models; employer job CRUD +
  lifecycle (draft/publish/close/reopen, own jobs only); public job search
  (portable keyword/location/type/salary filters, newest/relevant sort,
  pagination, URL-state) and detail; public company directory + detail
  (approved employers only); Django Admin job moderation (suspend/close/remove/
  mark-supported) writing audit entries; company slug on EmployerProfile.
- **Scope (frontend, public):** adaptive job search (desktop split-screen,
  mobile list + filter drawer, URL-synced filters, debounced keyword, skeletons,
  honest empty/error states), job detail (decision-first header, Apply/Save/Share,
  sections incl. a labelled Job-Fit placeholder, missing-data + undisclosed-salary
  handling, sticky panels), company directory + detail. EN/zh-CN parity.
- **Validation:** backend ruff/check/drift/migrate green, 132 pytest passing;
  frontend lint/typecheck/build (55 pages) green, 45 Vitest tests passing.
- **Security review:** found 1 BLOCKER — `Job.objects.public()` did not gate on
  employer approval, so a suspended employer's published jobs stayed publicly
  visible. FIXED (public() now requires employer APPROVED or MHA-owned) with a
  regression test; also added public-endpoint throttle and salary-oracle
  hardening (the two recommendations). Re-verified PASS.
- **Employer job-management UI:** list/create/edit/preview own jobs with the
  screening-questions editor and publish/close/reopen actions (approved-only,
  suspended jobs read-only with moderation reason). 63 frontend tests passing.
- **CI note:** the first Phase 4 push failed the PostgreSQL clean-DB migrate —
  the employer-slug migration created the varchar `_like` index twice on
  Postgres (SQLite has no `_like` indexes, so it passed locally). Fixed by
  adding the slug column without an index on the transient step; CI green.
- **Checkpoint:** pushed to `origin/feat/claude-full-mvp` (CI green on Postgres).

## Phase 5 — Candidate profile & secure resume ✅

- **Scope (backend):** Private resume storage (FileSystemStorage outside any
  public route, `base_url=None`, opaque UUID filenames), magic-byte validation
  (PDF `%PDF` / DOCX OOXML-zip, ≤5MB, reject exe/zip/mismatch), atomic
  replace/remove. Candidate API: GET/PATCH `/candidate/profile/` (resume fields
  read-only), POST/DELETE `/candidate/resume/`, owner-only permission-checked
  `/candidate/resume/download/` (the ONLY byte path — no public URL), and
  `/candidate/dashboard/` (profile completion + honest zero app stats). Resume
  audit events.
- **Scope (frontend):** profile editor, resume manager (client pre-check +
  FormData upload, download-link to the permission-checked endpoint, replace/
  remove), candidate dashboard with next-action logic + profile-completion
  meter. No public file URL constructed anywhere. EN/zh-CN parity.
- **Validation:** backend ruff/check/drift/migrate green, 159 pytest passing
  (incl. cross-candidate denial, path-traversal, MIME/size rejection, no-URL);
  frontend lint/typecheck/build (55 pages) green, 79 Vitest tests passing.
- **Security review:** PASS, no blockers — private bytes leave only via one
  owner-scoped FileResponse, no `.url` exposed, traversal structurally
  impossible, magic-byte validation. 2 recommendations (endpoint throttling,
  download-audit volume) batched into Phase 12 hardening.
- **Checkpoint:** pushed to `origin/feat/claude-full-mvp`.

## Phase 6 — Applications & candidate tracking ✅

- **Scope (backend):** Application + ApplicationAnswer + ApplicationStatusHistory
  models (status enum APPLIED→…→HIRED/REJECTED, unique job+candidate). Apply flow
  POST `/jobs/{slug}/apply/`: requires a resume, one application per job (409 on
  duplicate, race-safe), validates required screening answers per type, copies
  the resume into an immutable private snapshot, records initial APPLIED history
  + audit. Candidate tracking: `/candidate/applications/` list + `{id}/` detail
  (own-only, full status timeline, employer notes NEVER exposed), already-applied
  signal `/jobs/{slug}/application/`. Real candidate dashboard counts (Rejected
  excluded from active).
- **Scope (frontend):** apply experience (cover letter + per-type screening
  controls, review, confirmation, error mapping incl. no-resume→resume page and
  409→View Application), job-detail Apply↔View switch, applications list +
  detail with a localized status timeline + plain-language meanings, real
  dashboard snapshot. EN/zh-CN parity.
- **Note:** the Phase 6 backend was implemented directly by the supervisor
  (subagent API was transiently overloaded); frontend was delegated once the API
  recovered.
- **Validation:** backend ruff/check/drift/migrate green, 173 pytest passing;
  frontend lint/typecheck/build (55 pages) green, 96 Vitest tests passing.
- **Security review:** PASS, no blockers — own-only scoping (404 no leak),
  private notes never serialised, immutable private resume snapshot, race-safe
  duplicate prevention, server-side answer validation. 3 minor recommendations
  (answer-json float precision, snapshot-name length, apply throttle) → Phase 12.
- **Checkpoint:** pushed to `origin/feat/claude-full-mvp`.

## Phase 7 — Employer applicant workspace ✅

- **Scope (backend):** Employer applicant API scoped strictly to own jobs:
  `/employer/applications/` (+ filters), `/employer/jobs/{id}/applications/`,
  `/employer/applications/{id}/` (detail incl. employer-only notes), PATCH
  status (atomic, writes history + audit), PATCH notes, permission-checked
  applicant resume-snapshot download, `/employer/dashboard/` (real attention
  queue + active jobs + pipeline). Cross-employer/MHA-job access → 404, no leak.
  Fixed a snapshot-name path-leak (empty original name → neutral name).
- **Scope (frontend):** applicant workspace with switchable table / Kanban /
  split-screen (default), native DnD + keyboard "move to stage" alternative,
  optimistic status changes with rollback, rejection confirmation dialog,
  private-notes editor, resume open-link (permission-checked), and the live
  employer dashboard. EN/zh-CN parity.
- **Validation:** backend ruff/check/drift/migrate green, 196 pytest passing;
  frontend lint/typecheck/build (55 pages) green, 104 Vitest tests passing.
- **Security review:** PASS, no blockers — employer isolation by scoped queryset
  (404 no leak), private notes employer-only, resume download permission-checked,
  status change service-only + audited. Recommendations: snapshot-name leak
  (FIXED now) and workspace throttle (→ Phase 12).
- **Checkpoint:** pushed to `origin/feat/claude-full-mvp`.
