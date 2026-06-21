# Definition of Done — MVP Checklist (spec §31)

Status of each definition-of-done criterion for the implemented MVP.

| Criterion | Status | Notes |
|---|---|---|
| Code implemented for all approved phases (0–12) | ✅ | All phases delivered. |
| Database migrations included | ✅ | Per-app migrations; clean-DB migrate verified on SQLite locally and PostgreSQL in CI. |
| Tests pass | ✅ | Backend 286 pytest; frontend 160 Vitest; both green in CI. |
| Linting & type checks pass | ✅ | ruff (backend); ESLint + tsc (frontend); enforced in CI. |
| Permissions tested | ✅ | Object-level / role / status boundaries tested; six account-status boundaries covered. |
| Loading / empty / error / success / permission states | ✅ | Provided across screens via shared state components. |
| English & Simplified Chinese where user-facing | ✅ | 10 namespaces at full parity; backend-generated strings code-mapped/localised. |
| Responsive behaviour reviewed | ✅ | Desktop/tablet/mobile; split-screen → list+drawer; mobile homepage composition. |
| Accessibility reviewed | ✅ | WCAG 2.2 AA direction; audit blockers fixed (contrast, dialog focus trap, chart text alternatives, keyboard DnD alternative, reduced motion). |
| Documentation updated | ✅ | README, ADR-0001, API.md, I18N_COVERAGE.md, PROGRESS.md, this checklist. |
| No unrelated feature changed per commit | ✅ | Atomic commits per the convention. |
| Files in correct feature/app folders | ✅ | Repo-quality reviewed each phase. |
| No temporary/duplicate/backup/abandoned files | ✅ | Cleaned; reviewed. |
| Known limitations recorded honestly | ✅ | Below + in PROGRESS.md / I18N_COVERAGE.md. |

## Excluded features (correctly NOT built — spec §6.2)
Payments/billing, paid featured listings, built-in messaging/chat, video
interviews, interview scheduling, external job-board scraping/reposting,
automatic job-description translation, predictive/automated hiring decisions, AI
candidate ranking for employers, native mobile apps, production hosting config.

## Known limitations / production-readiness gaps
- **PostgreSQL is canonical** but exercised only in CI (no local Postgres in the
  build environment); SQLite is the documented local fallback (ADR-0001 §6).
- **Simplified Chinese copy needs a native-language review** before production
  (I18N_COVERAGE.md).
- **Transactional emails are English-only**; localising them needs compiled
  Django `.mo` catalogues (the build environment lacks the `gettext` toolchain).
- **Smart Job Fit AI explanation** is disabled by default; only the provider-
  neutral interface + deterministic (now frontend-composed) copy ship. No real
  AI provider is configured in the MVP.
- **JobViewEvent has no retention/pruning job** — recommended for production
  (rows are non-identifying).
- **Resume malware scanning** is a documented pre-production requirement
  (spec §22.2); MVP validates type/MIME/size and stores privately.
- **Provisional MHA brand tokens** — official brand colours must be extracted
  from approved assets before final visual sign-off (spec §12.2).
- Production hosting, managed Postgres, private object storage, email delivery,
  HTTPS, backups, and the Malaysian PDPA compliance review remain future-phase
  items (spec §22.4, §36).

## Demo data
`python manage.py seed_demo_data` (idempotent, DEBUG-guarded) creates synthetic
demo content and prints local-only demo accounts (shared password
`DemoPass123!`). Never use demo data or credentials in production.
