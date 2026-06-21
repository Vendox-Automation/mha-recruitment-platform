# API Reference (MVP)

Base prefix: `/api/v1/`. Authentication is Django session cookie + CSRF (DRF
`SessionAuthentication`); unsafe methods require the `X-CSRFToken` header.
Responses paginate with `{count,next,previous,results}` and errors use the
normalised envelope `{code,message,fields?,request_id}` (see ADR-0001 §7).
Permissions: `public` = AllowAny; `candidate` = signed-in candidate; `employer`
= approved employer; `admin` = Django admin (internal).

## Health
- `GET /health/` — service + DB probe (public).

## Auth (`/auth/`)
- `POST register/candidate/` (public) — create candidate + profile, log in.
- `POST register/employer/` (public) — create pending employer + profile, log in.
- `POST login/` · `POST logout/` · `GET csrf/` · `POST refresh/` (session revalidate).
- `GET me/` · `PATCH me/` — current user + safe self-update.
- `POST password-reset/request/` · `POST password-reset/confirm/`.
- `GET|POST verify-email/` — email verification.

## Candidate (`/candidate/`, candidate)
- `GET|PATCH profile/` — own profile (resume fields read-only here).
- `POST|DELETE resume/` · `GET resume/download/` — private resume (owner-only stream).
- `GET dashboard/` — completion, resume, real application + saved-job counts.
- `GET applications/` · `GET applications/{id}/` — own applications + status timeline.
- `GET saved-jobs/` · `POST saved-jobs/` · `DELETE saved-jobs/{job_id}/`.
- `GET support-requests/` — own support history.

## Employer (`/employer/`, employer)
- `GET|PATCH profile/` — own company profile (approval fields read-only).
- `GET approval-status/`.
- `GET dashboard/` — attention queue, active jobs, pipeline (real counts).
- `GET analytics/` — views, applications, conversion, time-to-first, stage dist (own jobs; null when unreliable).
- `POST jobs/` · `GET jobs/` · `GET|PATCH jobs/{id}/` — own job CRUD (+ nested screening questions).
- `POST jobs/{id}/publish/` · `close/` · `reopen/` — lifecycle.
- `GET jobs/{job_id}/applications/` · `GET applications/` — applicants to own jobs.
- `GET applications/{id}/` — applicant detail (incl. employer-only notes).
- `PATCH applications/{id}/status/` · `PATCH applications/{id}/notes/`.
- `GET applications/{id}/resume/` — applicant resume snapshot (permission-checked stream).

## Public jobs & companies
- `GET /jobs/` (public) — search: `keyword,location,employment_type,salary_min,salary_max,sort,page`.
- `GET /jobs/{slug}/` (public) — job detail (records a privacy-aware view event).
- `GET /companies/` · `GET /companies/{slug}/` (public) — approved-employer directory + detail.

## Applications & Smart Job Fit
- `POST /jobs/{slug}/apply/` (candidate) — apply (resume required, one per job, screening answers).
- `GET /jobs/{slug}/application/` (candidate) — already-applied signal.
- `GET /jobs/{slug}/fit/` · `POST /jobs/{slug}/fit/regenerate/` (candidate) — Smart Job Fit (reason codes, band, disclaimer).

## Support & insights
- `POST /support-requests/` (public) — career support intake (optional private attachment).
- `GET /support-requests/{id}/attachment/` (owner/admin) — permission-checked attachment.
- `GET /insights/public/` (public) — real platform aggregates + curated `mha_insights`.

## Administration
Django Admin (`/admin/`) is the internal MVP administrator interface: employer
approval workflow, job moderation, market insights, support workflow, users,
applications, audit log (append-only). See spec §9.5 / §14.13.
