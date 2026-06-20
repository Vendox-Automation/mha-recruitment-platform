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
