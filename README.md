# Talent Bridge — Claude Executive Version

An independent Claude Code implementation of MHA Consultancy’s complete bilingual recruitment platform.

This repository is intended to be compared with a separate implementation of the same approved business requirements. The product scope is the same; the architecture and visual execution are independently designed.

## Product direction

This version uses a professional, premium, and architectural design language built around:

- Balanced MHA branding
- Equal Candidate and Employer pathways
- An integrated executive homepage hero
- Adaptive asymmetrical layouts
- A Career Intelligence Console
- Architectural editorial storytelling
- Professional photography and original analytical graphics
- Refined public-page interaction
- Calm, efficient dashboards and forms
- MHA human expertise at high-value moments

It intentionally avoids playful characters, youth-oriented styling, fake live metrics, and generic recruitment templates.

## Product scope

The MVP includes:

- Public job search and job details
- Public company discovery
- Candidate accounts and profiles
- Secure private resume handling
- Direct job applications
- Transparent application tracking
- Employer registration and MHA approval
- Employer job management
- Applicant table, Kanban, and split-screen review
- Rule-based Smart Job Fit with optional AI explanation
- Saved jobs
- Career and recruitment support requests
- Credible analytics and Career Intelligence content
- MHA administration and audit records
- English and Simplified Chinese

The MVP excludes payments, built-in messaging, external job-board scraping, automated hiring decisions, and production deployment.

## Approved stack

- Next.js App Router
- TypeScript
- npm
- Django
- Django REST Framework
- PostgreSQL
- Django Admin
- English and Simplified Chinese

## Documentation source of truth

Read in this order:

1. [`CLAUDE.md`](CLAUDE.md)
2. [`AGENTS.md`](AGENTS.md)
3. [`docs/product/MHA_Standalone_Job_Platform_Claude_Executive_Full_Developer_Package_v1.0.md`](docs/product/MHA_Standalone_Job_Platform_Claude_Executive_Full_Developer_Package_v1.0.md)
4. [`docs/development/COMMIT_CONVENTION.md`](docs/development/COMMIT_CONVENTION.md)
5. Project subagents under [`.claude/agents/`](.claude/agents/)

## Repository structure

```text
mha-recruitment-platform/
├── .claude/agents/        # project subagent definitions
├── .github/workflows/     # CI and commit-message validation
├── backend/               # Django + DRF API
│   ├── config/            # settings (base/dev/prod/test), urls, glue
│   └── apps/              # domain apps: accounts, candidates, employers,
│                          #   jobs, applications, matching, support,
│                          #   analytics, audit
├── frontend/              # Next.js App Router + TypeScript
│   └── src/{app,components,features,lib,messages,styles}
├── docs/
│   ├── architecture/      # ADRs
│   ├── development/        # commit convention
│   └── product/            # product specification
├── scripts/               # repository tooling (commit-msg validator)
├── docker-compose.yml      # local PostgreSQL (+ optional Mailpit)
├── CLAUDE.md  AGENTS.md  README.md
```

Architecture decisions are recorded in
[`docs/architecture/ADR-0001-stack-and-structure.md`](docs/architecture/ADR-0001-stack-and-structure.md).

## Autonomous workflow

The user intends to review only the final merged platform.

Claude Code must:

1. Work on `feat/claude-full-mvp`.
2. Use the main session as lead supervisor.
3. Delegate to specialised project subagents.
4. Implement all approved phases continuously.
5. Run tests and independent reviews at each checkpoint.
6. Create atomic commits.
7. Push checkpoints to GitHub.
8. Open the final pull request.
9. Resolve blocking findings.
10. Merge with a normal merge commit.
11. Never squash merge.

The full commit history must remain visible in `main`.

## Starting Claude Code

### 1. Create and clone the repository

Recommended repository name:

```text
talent-bridge-claude
```

Clone it into the user’s normal GitHub projects folder and copy this package into the repository root.

### 2. Commit the documentation baseline

```text
docs(repo): add claude implementation package
```

Push the baseline to `main` before starting the autonomous build.

### 3. Verify Claude Code sees the project configuration

Start Claude Code from the repository root.

Use `/memory` to confirm the root `CLAUDE.md` is loaded, and `/agents` to confirm the project subagents are available.

Project subagents are loaded when the Claude Code session starts. Restart the session after changing agent definitions.

### 4. Start the supervisor

Preferred when the installed Claude Code version supports project agents as the main session:

```text
claude --agent lead-supervisor
```

Otherwise start normal Claude Code in the repository root and paste the kickoff prompt from Section 33 of the product specification.

### 5. Allow the autonomous branch workflow

The supervisor creates:

```text
feat/claude-full-mvp
```

It must not push product work directly to `main`.

## Commit format

```text
type(module): short description
```

Example:

```text
feat(applications): add candidate status timeline
```

See the full convention in `docs/development/COMMIT_CONVENTION.md`.

## Merge policy

The final pull request must use a normal merge commit.

Do not use squash merge.

This preserves every validated atomic commit message in the `main` branch history.

## Local setup

Requirements: Node.js 20+ (developed on 24), Python 3.12–3.14 (developed on
3.14), and PostgreSQL — either via Docker or a local install.

### 1. Database

PostgreSQL is the canonical database. Start it with Docker:

```bash
cp .env.example .env
docker compose up -d db
```

If Docker and PostgreSQL are unavailable, the backend falls back to SQLite for
local development by setting a SQLite `DATABASE_URL` (see the note below). CI
runs migrations and tests against PostgreSQL.

### 2. Backend (Django API — http://localhost:8000)

```bash
cd backend
python -m venv .venv
# Windows:  .venv\Scripts\activate     macOS/Linux:  source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # set DATABASE_URL (Postgres canonical)
python manage.py migrate
python manage.py runserver
```

Health check: `GET http://localhost:8000/api/v1/health/`.

Run checks: `ruff check . && ruff format --check . && python manage.py check && pytest`.

> **Database note (ADR-0001 §6).** PostgreSQL is canonical. Where Postgres is
> unavailable, set `DATABASE_URL=sqlite:///./db.sqlite3` in `backend/.env` to
> run locally; all code stays backend-agnostic and CI exercises PostgreSQL.

### 3. Frontend (Next.js — http://localhost:3000)

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Run checks: `npm run lint && npm run typecheck && npm run build`.

The app is locale-prefixed: open `http://localhost:3000/en` or
`http://localhost:3000/zh-CN`.

### 4. Commit-message hook (optional but recommended)

```bash
git config core.hooksPath .githooks
```

This enforces `docs/development/COMMIT_CONVENTION.md` locally; CI enforces it on
pull requests.

### 5. Seed demo data (optional)

From `backend/` (with the venv active and `DATABASE_URL` set):

```bash
python manage.py seed_demo_data
```

Idempotent and DEBUG-guarded. It creates synthetic demo content (employers,
~20 jobs across Malaysian locations, applications across every status, saved
jobs, Job Fit examples, support requests, market insights) and prints local-only
demo accounts — all sharing the password `DemoPass123!`:

| Role | Email |
|---|---|
| Administrator (Django admin) | `admin@demo.mha-jobs.local` |
| Approved employer | `talent@demo.aurorabank.example.com` |
| Pending employer | `pending@demo.summitventures.example.com` |
| Candidate (complete profile + resume) | `candidate.complete@demo.mha-jobs.local` |
| Candidate (incomplete profile) | `candidate.incomplete@demo.mha-jobs.local` |

The demo data is synthetic and must never be used in production. See
[`docs/development/API.md`](docs/development/API.md) for the API reference and
[`docs/development/DEFINITION_OF_DONE.md`](docs/development/DEFINITION_OF_DONE.md)
for the MVP definition-of-done and known limitations.

## Security

This platform processes resumes, contact details, applications, employer records, and recruitment data.

Never:

- Commit secrets
- Commit real personal data
- Expose resumes through unrestricted public URLs
- Rely on frontend checks for authorization
- Store long-lived authentication tokens in browser local storage
- Fabricate analytics or activity

## Repository visibility

Private repository. No public licence has been assigned.