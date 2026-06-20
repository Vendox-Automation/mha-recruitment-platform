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

## Initial repository package

```text
talent-bridge-claude/
├── .claude/
│   └── agents/
├── docs/
│   ├── development/
│   │   └── COMMIT_CONVENTION.md
│   └── product/
│       └── MHA_Standalone_Job_Platform_Claude_Executive_Full_Developer_Package_v1.0.md
├── CLAUDE.md
├── AGENTS.md
└── README.md
```

Phase 0 creates the application directories, environment examples, CI, local PostgreSQL service, health checks, and verified startup documentation.

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

Verified local setup commands will be created during Phase 0 after the application scaffold and exact dependency versions exist.

Do not add unverified startup commands to this README.

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