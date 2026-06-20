# AGENTS.md

## 1. Purpose

This file defines the mandatory operating contract for Claude Code, the lead supervisor, implementation subagents, and independent reviewer subagents in this repository.

The user will review only the completed platform after it has been merged into `main`. Ordinary phase approvals are not required.

The lead supervisor owns the complete outcome: planning, delegation, implementation, integration, review, validation, commits, pushes, pull-request creation, final merge, and reporting.

---

## 2. Source of truth

Read these files completely before planning or changing code:

1. `CLAUDE.md`
2. `AGENTS.md`
3. `docs/product/MHA_Standalone_Job_Platform_Claude_Executive_Full_Developer_Package_v1.0.md`
4. `docs/development/COMMIT_CONVENTION.md`
5. `README.md`
6. Relevant files under `.claude/agents/`
7. Any more specific nested instruction file

The product specification is authoritative for:

- Product scope and exclusions
- Business rules
- Roles and permissions
- Public, candidate, employer, and administrator workflows
- Page requirements
- UI/UX direction
- Career Intelligence Console
- Smart Job Fit
- Localisation
- Security and privacy
- Data model and APIs
- Testing and acceptance criteria
- Phase sequence
- Definition of done

This file is authoritative for:

- Autonomous execution
- Lead-supervisor responsibility
- Subagent coordination
- Repository discipline
- Git and GitHub workflow
- Review gates
- Stop conditions
- Final merge behaviour

When instructions conflict:

1. Protect security, privacy, permissions, and user data first.
2. Follow the most specific applicable instruction.
3. Preserve approved business scope and visual direction.
4. Prefer reversible changes.
5. Record the conflict.
6. Stop only when safe implementation is impossible without user input.

---

## 3. Durable objective

The durable objective is:

> Independently implement the complete approved MHA bilingual recruitment-platform MVP, validate it thoroughly, preserve all progress on GitHub, open the final pull request, and merge it into `main` with full atomic commit history after every mandatory gate passes.

The objective is complete only when:

- All approved phases are implemented
- Excluded features remain excluded
- Public, candidate, employer, and administrator journeys work
- Backend and frontend checks pass
- Security and object-level permissions pass
- Private resume access is verified
- English and Simplified Chinese are complete
- Responsive and accessibility reviews pass
- The executive visual direction is delivered
- Career Intelligence data sources are honest
- Repository documentation is accurate
- The feature branch is pushed
- A final pull request is opened
- Required checks pass
- Blocking findings are resolved
- The pull request is merged using a normal merge commit
- Individual commit messages remain visible in `main`
- A final report is produced

---

## 4. Approved implementation identity

Expected repository name:

```text
talent-bridge-claude
```

If the user chooses another repository name, update documentation references in one coherent documentation commit before implementation.

Working branch:

```text
feat/claude-full-mvp
```

Approved stack:

- Next.js App Router with TypeScript
- npm
- Django
- Django REST Framework
- PostgreSQL
- Django-owned authentication
- Django Admin
- English and Simplified Chinese
- Local development first

The implementation must be independent. Do not copy code from the Codex build or any other proprietary implementation.

---

## 5. Lead supervisor

The main Claude Code session acts as lead supervisor.

The supervisor must:

1. Verify repository, branch, remote, tools, and source-of-truth documents.
2. Create and maintain the phase plan.
3. Decompose work into non-overlapping tasks.
4. Select appropriate subagents.
5. Define ownership boundaries before parallel work.
6. Integrate subagent work.
7. Run validation.
8. Request independent reviews.
9. Resolve blocking findings.
10. Create atomic commits.
11. Push checkpoints.
12. Maintain phase documentation.
13. Open and merge the final pull request.
14. Produce the final report.

The supervisor may make ordinary technical decisions that remain within the approved stack, scope, and design direction.

The supervisor must not delegate final responsibility.

---

## 6. Subagent model

Project subagents live under `.claude/agents/` and are checked into Git.

Required specialist roles include:

- Architecture planner
- Django backend engineer
- Next.js frontend engineer
- UI/UX design specialist
- Security and privacy reviewer
- Testing and quality engineer
- Accessibility and localisation reviewer
- Visual QA reviewer
- Repository quality reviewer
- Final release reviewer

### 6.1 Delegation rules

Use subagents when work is:

- Domain-specific
- Parallelisable
- Large enough to benefit from isolated context
- Suitable for independent review

Before delegation, provide:

- Phase and objective
- Source-of-truth sections
- Exact ownership boundaries
- Files or folders allowed to change
- Acceptance criteria
- Required tests
- Prohibited scope
- Expected report format

Do not assign overlapping write ownership to parallel agents.

### 6.2 Implementation agents

Implementation agents may edit only assigned areas.

They must:

- Inspect existing patterns before editing
- Preserve public contracts unless change is approved
- Run focused checks
- Report changed files and risks
- Avoid commits unless the supervisor explicitly assigns commit ownership
- Avoid broad cleanup outside the task

### 6.3 Reviewer agents

Reviewer agents are read-only by default.

They must:

- Inspect the actual diff and relevant surrounding code
- Report findings by severity
- Include file and line references
- Distinguish blockers from recommendations
- State pass or no-pass
- Avoid editing or reverting files

The supervisor creates a separate remediation task after reviewing findings.

### 6.4 Review independence

An agent must not be the only reviewer of its own implementation.

At minimum:

- Backend/security changes receive security review
- Frontend changes receive UI/accessibility/i18n review
- Every phase receives repository/test review
- Final release receives full independent review

---

## 7. Autonomous phase execution

Execute the approved phases continuously.

For each phase:

1. Inspect repository state.
2. Read relevant specification sections.
3. Define acceptance criteria.
4. Identify dependencies and risks.
5. Assign non-overlapping subagent tasks.
6. Implement.
7. Run focused checks.
8. Run the complete relevant suite.
9. Launch independent reviews.
10. Resolve blockers.
11. Check repository cleanliness.
12. Create atomic commits.
13. Push the branch.
14. Record the checkpoint.
15. Continue to the next phase.

Do not wait for user approval after a successful phase.

Approved sequence:

- Phase 0: repository and environment bootstrap
- Phase 1: design system and localisation shell
- Phase 2: authentication and roles
- Phase 3: employer approval
- Phase 4: jobs, companies, and search
- Phase 5: candidate profile and private resume
- Phase 6: applications and candidate tracking
- Phase 7: employer applicant workspace
- Phase 8: Smart Job Fit
- Phase 9: saved jobs, support, and analytics
- Phase 10: executive homepage and intelligence experience
- Phase 11: English and Simplified Chinese completion
- Phase 12: hardening and final review

The supervisor may adjust technical order without omitting scope or acceptance criteria.

---

## 8. Design implementation contract

The Claude version must be visibly different from the comparison build while preserving the same product scope.

Required direction:

- Professional and premium
- Modern corporate technology
- Executive consultancy
- Architectural minimalism
- Balanced MHA branding
- Equal candidate and employer entry paths
- Integrated executive hero
- Adaptive asymmetrical grid
- Career Intelligence Console
- Architectural storytelling
- Hybrid professional photography and analytical graphics
- Adaptive MHA consultant layer
- Refined public-page motion
- Calm operational screens

Prohibited direction:

- Playful mascots or characters
- Youth-oriented visual language
- Generic job-board template
- Excessive rounded-card layouts
- Scroll hijacking
- Unrelated colour palettes
- Fake live metrics
- Invented client logos, testimonials, awards, placements, or success rates
- Misleading analytics
- Decorative motion that blocks tasks

Official MHA brand assets determine final colours. Do not invent final brand values when assets are missing.

---

## 9. Product integrity

Do not add excluded features:

- Online payments
- Built-in candidate-employer messaging
- External job-board scraping
- Automatic external publishing
- Video interviewing
- Payroll
- Attendance
- CRM scope
- Automated hiring decisions
- Employer-side candidate ranking by AI
- Sensitive-trait inference
- Production deployment unless separately approved

Do not silently simplify required features.

---

## 10. Backend authority

Django is authoritative for:

- Accounts
- Passwords
- Sessions
- Roles
- Statuses
- Permissions
- Employer approval
- Job visibility
- Applications
- Status history
- Resume access
- Job Fit calculation
- Audit records
- Analytics eligibility

Frontend checks are user-experience improvements, not security boundaries.

Every sensitive query must be permission-scoped on the server.

---

## 11. Authentication and browser storage

Required direction:

- Secure Django session or approved HttpOnly-cookie architecture
- CSRF protection
- No long-lived token in localStorage or sessionStorage
- Session rotation on authentication
- Secure logout
- Rate limiting or throttling for sensitive public endpoints
- Email verification and password-reset foundations
- Status-aware access

Test candidate, pending employer, approved employer, rejected employer, suspended employer, and administrator boundaries.

---

## 12. Resume and personal-data security

Resumes are private.

Requirements:

- Validate extension, MIME type, size, and upload intent
- Generate server-side filenames
- Store outside unrestricted public media access
- Permission-check every download or preview
- Prevent path traversal
- Prevent cross-candidate and cross-employer access
- Record access-sensitive audit events where appropriate
- Do not commit real personal data
- Use synthetic seed data only

---

## 13. Career Intelligence integrity

Every insight module must identify its source state:

- MHA-managed insight
- Real platform aggregate
- Illustrative preview

Never fabricate activity.

Do not expose:

- Cross-employer confidential data
- Candidate-sensitive information
- Small-group aggregates that may identify individuals
- Unsupported salary guidance

Hide or replace unreliable metrics with honest empty states.

---

## 14. Localisation

English and Simplified Chinese are first-class.

Requirements:

- Externalise user-facing strings
- Keep translation keys aligned
- Translate validation, loading, empty, success, error, and permission states
- Preserve route and query state during locale changes
- Set document language correctly
- Format date, number, and salary appropriately
- Do not automatically translate employer-authored job content
- Flag content requiring native review

Do not postpone all translation work until the final phase.

---

## 15. Accessibility

Meet WCAG 2.2 AA direction.

Requirements include:

- Keyboard navigation
- Visible focus
- Semantic structure
- Labelled controls
- Accessible dialogs
- Text alternatives
- Adequate contrast
- Error association
- Status announcements
- Reduced-motion support
- Data-visualisation summaries
- Keyboard alternatives to drag-and-drop

Accessibility blockers must be resolved before merge.

---

## 16. Repository organisation

Keep the repository root minimal.

Expected top-level structure after bootstrap:

```text
.claude/
.github/
backend/
docs/
frontend/
scripts/
CLAUDE.md
AGENTS.md
README.md
docker-compose.yml
```

Do not place feature code in the root.

Rules:

- Frontend feature code belongs in feature folders
- Backend domain code belongs in Django apps
- Shared utilities require a demonstrated cross-domain use
- Page and route files remain composition-focused
- Business logic does not live in React page files
- Serializers and views do not become unbounded god files
- Tests live close to the domain or in an intentional test structure
- Generated output, virtual environments, build output, local media, databases, and secrets are ignored

Before every commit, remove unused and misplaced files.

---

## 17. Git workflow

### 17.1 Branch creation

Begin from an up-to-date `main`:

```text
git fetch origin
git switch main
git pull --ff-only origin main
git switch -c feat/claude-full-mvp
```

Do not overwrite an existing branch without inspection.

### 17.2 Commit requirements

Follow:

```text
type(module): short description
```

Every commit must be:

- Coherent
- Reviewable
- Reversible
- Validated
- Free of unrelated cleanup
- Fewer than 72 characters in the subject

Do not create WIP commits on the shared branch.

### 17.3 Push checkpoints

Push after every validated phase or substantial coherent unit:

```text
git push -u origin feat/claude-full-mvp
```

Do not leave long-running validated progress only locally.

### 17.4 History preservation

All individual atomic commit messages must remain visible in GitHub after merge.

Therefore:

- Normal merge commit is required
- Squash merge is prohibited
- Do not rewrite shared history after checkpoint pushes
- Avoid force push
- Keep the feature branch until merge succeeds

### 17.5 Final pull request and merge

After all gates pass:

1. Push the final branch.
2. Open a pull request from `feat/claude-full-mvp` to `main`.
3. Include scope, test evidence, screenshots, security notes, migration notes, and limitations.
4. Wait for required checks.
5. Resolve blocking findings.
6. Merge using a normal merge commit.
7. Verify `main` contains the full commit history.
8. Optionally delete the remote feature branch after verification.

If automatic merge is blocked by permissions or protection, leave the pull request ready and report the exact blocker.

---

## 18. Validation gates

Run commands discovered and documented during Phase 0.

At minimum, final validation covers:

Backend:

- Formatting
- Linting
- Django system check
- Migration drift check
- Migration execution from a clean database
- Complete backend tests
- Permission tests
- Upload and resume-security tests

Frontend:

- Formatting
- Linting
- Type checking
- Unit/component tests
- Production build
- Dependency audit
- Translation parity

Integrated:

- End-to-end core journeys
- Accessibility audit
- Responsive screenshots
- Visual regression or screenshot review
- Security review
- Seed-data verification
- Clean startup documentation

Never claim a check passed without its actual result.

---

## 19. Visual QA gate

Capture and review at least:

- Homepage neutral perspective
- Homepage candidate perspective
- Homepage employer perspective
- Job search desktop and mobile
- Job detail
- Candidate registration
- Employer registration
- Candidate dashboard
- Employer dashboard
- Applicant table
- Kanban
- Split-screen review
- Pending, rejected, suspended, empty, error, and loading states
- English and Simplified Chinese key routes

Review at desktop, tablet, and mobile widths.

Block merge for:

- Broken layout
- Incorrect MHA branding
- Generic template appearance
- Inaccessible contrast
- Clipped Chinese text
- Misleading data
- Missing responsive state
- Excessive or disorienting motion

---

## 20. Stop conditions

Stop and request user input only when:

- A required secret or external credential is missing
- GitHub authentication prevents push, pull request, or merge
- Branch protection requires a human approval that cannot be satisfied autonomously
- An operation is destructive or irreversible outside the repository
- A legal or compliance decision requires MHA confirmation
- Official brand assets are essential and unavailable for a final irreversible decision
- Approved requirements conflict in a way that changes product scope materially
- A required external service is unavailable and no safe local substitute exists
- Usage limits prevent continuation

Do not stop for ordinary implementation choices, package installation, tests, commits, pushes, phase transitions, reviewer remediation, or documentation updates.

---

## 21. Final report

After merge, report:

- Final merge commit
- Pull-request URL
- Feature-branch commit list
- Confirmation that squash was not used
- Implemented scope by phase
- Exact validation results
- Screenshots or route-review artefacts
- Security review outcome
- Accessibility outcome
- Translation coverage
- Database migrations
- Demo accounts and seed command
- Known limitations
- Production-readiness gaps
- Local startup commands
- Any blocked external integration

The report must be factual and must not conceal incomplete work.