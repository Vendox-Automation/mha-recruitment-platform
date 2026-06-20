# Commit Convention

## 1. Required Format

Every commit subject must follow:

```text
type(module): short description
```

Example:

```text
feat(auth): add candidate registration
```

The rule applies to:

- Local commits
- Claude Code-generated commits
- Commits pushed to GitHub
- Pull-request titles

---

## 2. Allowed Types

| Type | Use when |
|---|---|
| `fix` | Correcting a bug or unintended behaviour |
| `feat` | Adding a new user-facing or system feature |
| `refactor` | Restructuring code without changing intended behaviour |
| `chore` | Dependencies, configuration, repository setup, maintenance |
| `docs` | Documentation-only changes |
| `test` | Adding or updating tests without product-code behaviour changes |

Do not use unapproved alternatives such as:

```text
feature
bugfix
style
perf
ci
build
update
change
```

Choose the closest approved type.

---

## 3. Module Rules

The module identifies the area primarily affected.

Requirements:

- Lowercase only
- Kebab-case when multiple words are needed
- Short and meaningful
- No spaces
- No uppercase letters
- No slash
- No filename or full path
- One primary module per commit

Good modules:

```text
repo
frontend
backend
auth
accounts
candidates
employers
jobs
applications
resumes
matching
support
analytics
admin
permissions
security
i18n
ui
homepage
intelligence
api
db
docker
setup
docs
tests
```

Valid:

```text
feat(employer-approval): add pending account workflow
```

Invalid:

```text
feat(Employer Approval): add pending account workflow
feat(frontend/auth/page.tsx): add candidate registration
feat(auth/jobs): update user and job logic
```

If one commit truly affects several layers of one feature, use the feature name:

```text
feat(auth): connect registration form to api
```

Do not use a broad module such as `app` when a clearer module exists.

---

## 4. Description Rules

The description must be:

- Short
- Lowercase
- Clear
- Specific
- Written as an action
- Free of a trailing full stop

The full subject must be fewer than 72 characters.

That means the maximum total subject length is 71 characters, including:

- Type
- Parentheses
- Module
- Colon
- Space
- Description

Good:

```text
feat(jobs): add salary range filter
fix(i18n): preserve locale during sign in
refactor(resumes): extract private file service
test(permissions): block cross-employer access
```

Bad:

```text
feat(jobs): Added salary range filter
feat(jobs): add salary range filter.
feat(jobs): various changes
fix(api): fix bug
chore(repo): update stuff
```

Use lowercase even for technology names in the subject:

```text
chore(frontend): initialize nextjs application
chore(backend): initialize django project
```

Technical detail can be explained in the optional commit body.

---

## 5. Commit Scope

Each commit must represent one coherent change.

A good commit should be:

- Understandable on its own
- Reversible on its own
- Reviewable without unrelated noise
- Validated before it is created

Do not:

- Create one commit for every file
- Put an entire large phase into one commit
- Mix a feature with unrelated cleanup
- Mix documentation-only changes with unrelated product changes
- Mix frontend and backend changes unless they form one inseparable vertical
  slice
- Create WIP commits
- Create “fix previous commit” commits when the change can be organised cleanly
  before committing
- Commit broken intermediate states to a shared branch

Examples of a clean sequence:

```text
chore(backend): initialize django project
chore(frontend): initialize nextjs application
chore(db): add local postgresql service
test(repo): add application health checks
docs(setup): document local startup
```

Another clean sequence:

```text
feat(auth): add custom user model
feat(auth): add candidate registration endpoint
feat(auth): connect candidate registration form
test(auth): add registration permission tests
docs(auth): document authentication flow
```

---

## 6. Type Selection Guide

### Use `feat`

When behaviour or capability is added:

```text
feat(jobs): add employment type filter
feat(applications): add candidate status timeline
feat(matching): add rule-based job fit score
```

### Use `fix`

When correcting existing intended behaviour:

```text
fix(auth): reject suspended employer sessions
fix(resumes): block unauthenticated file access
fix(i18n): retain search filters after locale switch
```

### Use `refactor`

When behaviour should remain unchanged:

```text
refactor(jobs): extract search query service
refactor(ui): split employer dashboard sections
```

Do not label a behavioural change as `refactor`.

### Use `chore`

For setup and maintenance:

```text
chore(repo): add monorepo folder structure
chore(deps): update development dependencies
chore(docker): add local postgresql service
```

### Use `docs`

For documentation-only work:

```text
docs(repo): add project specification and agent rules
docs(setup): add local development instructions
docs(api): document application endpoints
```

### Use `test`

For test-only changes:

```text
test(auth): add employer approval tests
test(permissions): prevent cross-employer access
test(jobs): cover salary filter boundaries
```

If a test is added in the same coherent commit as a small implementation,
choose the implementation type. For substantial or independently reviewable
test work, use a separate `test` commit.

---

## 7. Valid Examples

```text
docs(repo): add project specification and agent rules
chore(repo): add monorepo folder structure
chore(backend): initialize django project
chore(frontend): initialize nextjs application
chore(db): add local postgresql configuration
feat(auth): add candidate registration
feat(employers): add manual approval workflow
feat(jobs): add salary and location filters
feat(applications): add status history
feat(matching): add rule-based job fit score
feat(homepage): add candidate and employer modes
fix(i18n): preserve route during language switch
fix(resumes): restrict private file access
refactor(api): centralize frontend api client
refactor(jobs): extract search service
test(permissions): block cross-employer access
test(applications): prevent duplicate submissions
docs(setup): add local development guide
```

---

## 8. Invalid Examples

```text
Added authentication
feat: add authentication
feature(auth): add authentication
feat(Auth): add authentication
feat(auth): Add authentication
feat(auth): add authentication.
feat(auth): updates
fix(api): bug fix
chore(repo): miscellaneous changes
feat(frontend/auth): add registration
```

Reasons:

- Missing type or module
- Unapproved type
- Uppercase text
- Trailing full stop
- Vague description
- Invalid module format

---

## 9. Optional Commit Body

A body is optional.

Use it when the reviewer needs:

- Reason for the change
- Important implementation details
- Migration notes
- Security implications
- Breaking-change details
- Test evidence

Format:

```text
feat(auth): add candidate registration

- validate unique email addresses
- create the candidate profile atomically
- return the role-aware onboarding route
```

Keep the subject compliant even when a body is present.

---

## 10. Optional Footer

Use footers for issue references or reviewed metadata.

Example:

```text
feat(auth): add candidate registration

Refs: #24
```

Do not place secrets, personal data, resume content, or access tokens in commit
messages.

---

## 11. Pull-Request Titles

Pull-request titles must follow the same format.

Good:

```text
feat(auth): implement candidate registration
```

Bad:

```text
Phase 2 Authentication
Candidate registration changes
feat: implement candidate registration
```

The PR body may contain the detailed phase summary.

---

## 12. Branch Naming

Use:

```text
type/short-kebab-description
```

Examples:

```text
chore/phase-00-bootstrap
feat/phase-01-design-system
feat/phase-02-authentication
feat/employer-approval
fix/resume-access-control
refactor/job-search-service
docs/local-setup
test/application-permissions
```

Branch names do not replace compliant commit messages.

---

## 13. Validation Requirements

The repository should enforce this convention in two places:

1. A local `commit-msg` Git hook
2. A GitHub Actions check

The validator should check:

- Allowed type
- Required module
- Lowercase subject
- Kebab-case module
- Required colon and single space
- Non-empty description
- No trailing full stop
- Total subject length fewer than 72 characters

Recommended validation logic:

```text
1. Read the first line only.
2. Reject if length is greater than 71.
3. Reject if the subject differs from its lowercase form.
4. Reject if it does not match:
   ^(fix|feat|refactor|chore|docs|test)\([a-z0-9]+(?:-[a-z0-9]+)*\): .+$
5. Reject if the subject ends with a full stop.
```

The implementation may allow standard Git-generated special commits only when
they are required by the chosen merge strategy. The final repository workflow uses a normal merge commit so all atomic commits remain visible. The merge commit subject may use the approved exception documented below.

---

## 14. Pre-Commit Checklist

Before creating a commit:

- Confirm the change is coherent
- Review the diff
- Remove debug output
- Remove temporary files
- Remove unused imports and code
- Confirm no secrets are staged
- Run relevant tests
- Run relevant linting and type checks
- Confirm generated files are ignored
- Confirm the subject follows this convention

---

## 15. Claude Code Commit Report

After committing, Claude Code must report:

- Commit hash
- Commit subject
- Files included
- Checks run
- Exact results
- Whether the branch was pushed
- Pull-request status

Claude Code must not silently rewrite, squash, or discard commits without reporting
the action.


---

## 16. Final Merge History Requirement

The autonomous build must preserve all validated atomic commits in `main`.

Requirements:

- Use a normal merge commit for the final pull request
- Do not use squash merge
- Do not collapse all phases into one commit
- Do not rewrite shared checkpoint history
- Do not force-push after the branch is shared unless recovering from a verified security incident
- Verify the individual commit messages remain visible in GitHub after merge

The final merge commit may use:

```text
feat(repo): merge claude recruitment platform mvp
```

The pull-request title must also follow the normal commit subject format.