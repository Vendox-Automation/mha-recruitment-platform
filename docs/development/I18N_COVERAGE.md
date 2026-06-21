# Translation Coverage Report (Phase 11)

Languages: **English (`en`)** and **Simplified Chinese (`zh-CN` → `lang="zh-Hans"`)**, both first-class (spec §17).

## Coverage

- **Frontend UI strings** are fully externalised via `next-intl`. 10 namespaces
  (`common, home, jobs, companies, support, auth, candidate, employer,
  validation, legal`) exist for both locales and are at **full key parity**
  (verified by a recursive key-set diff; no missing/extra keys either way).
- **User-facing states** — loading, empty, error, success, permission-denied,
  and validation — are translated in both locales.
- **Locale-aware formatting** — dates, numbers, salary, and durations use the
  `Intl` API (no hardcoded formats).
- **Locale switching** preserves the current route **and** the URL query string
  (e.g. job-search filters survive a language switch), sets the document `lang`
  correctly (`en` / `zh-Hans`), and stores no token in browser storage.
- **Backend-generated candidate-facing strings** are localised:
  - **Smart Job Fit** matched/gaps/unknown reasons are emitted by the rule
    engine as stable **codes** and mapped to localised text on the frontend
    (`jobs.detail.fit.reasons.*`); the explanation prose is composed on the
    frontend; the disclaimer is rendered from a localised key.
  - **Application status** labels and meanings are code-mapped to localised text
    on the frontend.
  - **Server error messages** (DRF envelope) are localised on the frontend by
    error `code`, with contextual localised copy for the common auth/register
    cases (invalid credentials, duplicate email).
- **Employer-authored content** (job titles, descriptions, requirements, company
  text) is shown in the language it was written in and is **never machine-
  translated** (spec §14); `listing_language` is stored per job.

## Flagged for native-language review before production (spec §17)

1. **All Simplified Chinese copy was authored during the build and has NOT been
   reviewed by a native linguist.** A native zh-CN review of every message
   catalogue is required before production.
2. **Transactional emails are English-only.** Account verification, password
   reset, and employer approval/rejection emails are `gettext`-wrapped but no
   compiled `.mo` catalogue exists, and the build environment lacks the GNU
   `gettext` (`msgfmt`) toolchain. Localising emails requires compiling Django
   message catalogues (CI/production Linux has `gettext`) plus persisting a user
   locale preference for out-of-band sends. Recommended production task.
3. **Django server-side `gettext` catalogues are not compiled** for the same
   reason; Django's own built-in messages (e.g. password-validator text) still
   localise via Django's bundled `zh_Hans` catalogue when the request locale is
   active, but project-authored backend strings rely on the frontend mapping
   above rather than Django catalogues.

## Known limitations

- Chinese keyword insights (`popular_role_keywords`) use a portable English-only
  tokeniser, so Simplified-Chinese job titles tokenise weakly (no CJK
  segmentation) — consistent with the no-vendor-search MVP constraint.
