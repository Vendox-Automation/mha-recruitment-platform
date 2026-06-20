# CLAUDE.md

## Project identity

This repository contains the independent Claude Code implementation of MHA Consultancy’s standalone bilingual recruitment platform.

The product is a complete recruitment application, not a single affiliate landing page.

## Mandatory reading order

Before planning or changing code, read completely:

1. `CLAUDE.md`
2. `AGENTS.md`
3. `README.md`
4. `docs/development/COMMIT_CONVENTION.md`
5. `docs/product/MHA_Standalone_Job_Platform_Claude_Executive_Full_Developer_Package_v1.0.md`
6. Relevant project subagent definitions in `.claude/agents/`
7. Any more specific nested `CLAUDE.md` or `AGENTS.md`

Do not run `/init` in a way that overwrites or weakens these approved files.

## Durable objective

Implement, review, test, commit, push, and merge the complete approved MVP autonomously.

Work on `feat/claude-full-mvp`. Do not push product work directly to `main`.

At completion:

- Open the final pull request
- Resolve every blocking review finding
- Wait for required checks
- Merge with a normal merge commit
- Never squash merge
- Preserve every validated atomic commit and message in `main`
- Produce a final implementation report

## Execution mode

The main Claude session is the lead supervisor.

It must:

- Plan and coordinate the full build
- Delegate focused tasks to project subagents
- Integrate and review all work
- Continue through phases without ordinary user approval
- Commit and push validated checkpoints regularly
- Stop only for genuine blockers defined in `AGENTS.md`

Use the project subagents proactively. Implementation agents may edit only their assigned ownership areas. Independent reviewer agents are read-only and report findings to the supervisor.

## Product direction

The complete product scope, business rules, routes, data model, APIs, security requirements, phases, and acceptance criteria are in the product specification.

The Claude version’s design direction is:

- Professional, premium, and architectural
- Modern corporate technology plus executive consultancy
- Balanced use of official MHA branding
- Equal Candidate and Employer pathways
- Integrated executive hero
- Adaptive asymmetrical grid
- Career Intelligence Console
- Architectural storytelling
- Professional photography plus original analytical graphics
- Stronger motion on public pages and restrained motion on working screens
- Adaptive MHA human-support layer
- No playful characters or mascots
- No fake live data or invented proof

## Approved stack

- Next.js App Router with TypeScript
- npm
- Django
- Django REST Framework
- PostgreSQL
- Django-owned authentication and permissions
- Django Admin for internal administration
- English and Simplified Chinese
- Local development first

Do not replace the stack without explicit user approval.

## Non-negotiable engineering rules

- Authoritative business logic and permissions live in Django.
- Private resumes never use unrestricted public URLs.
- Long-lived authentication tokens are not stored in browser local storage.
- Object-level authorization is tested.
- User-facing states include loading, empty, error, success, and permission-denied handling.
- English and Simplified Chinese remain complete throughout implementation.
- No payments, built-in messaging, external scraping, or automated hiring decisions in the MVP.
- Do not fabricate metrics, testimonials, employers, placements, or platform activity.
- Keep route, page, and view files lean.
- Keep files in the folder that owns their responsibility.
- Remove temporary, duplicate, abandoned, backup, generated, or misplaced files before committing.

## Phase checkpoint rule

For every completed phase or coherent implementation unit:

1. Run relevant checks and tests.
2. Ask independent reviewer subagents to inspect the changes.
3. Resolve blocking findings.
4. Create atomic commits using the commit convention.
5. Push `feat/claude-full-mvp` to origin.
6. Record the checkpoint.
7. Continue automatically.

Do not keep hours of validated work only in the local worktree.

## Final merge rule

Use a normal GitHub merge commit. Squash merging is prohibited.

Automatic merge is allowed only when:

- All phases are complete
- Required tests and checks pass
- No blocking finding remains
- The branch is pushed
- The pull request accurately describes the implementation
- Repository protection permits the merge

If permissions or branch protection prevent merging, stop with the pull request ready and report the exact blocker.